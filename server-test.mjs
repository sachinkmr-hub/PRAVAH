// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// backend/simulation-engine.ts
var PROACTIVE_TERMS = ["PLANNED", "CIVIC", "VIP", "PROTEST", "FESTIVE", "PROCESSION", "MARATHON", "RALLY"];
function dashCategoryOf(cause) {
  const c = cause.toUpperCase();
  if (/WATER|TREE|WEATHER|RAIN|MONSOON|FLOOD/.test(c)) return "weather";
  if (/CIVIC|ROAD|INFRA|CONSTRUCTION|REPAIR|WORK/.test(c)) return "civic_works";
  if (/PROTEST|RALLY|VIP|STADIUM|MATCH|EVENT|PROCESSION|MARATHON/.test(c)) return "events_vips";
  if (/SIGNAL|POWER/.test(c)) return "signal_failures";
  return "incidents";
}
function classifyParadigm(eventType, cause) {
  const type = eventType.toUpperCase();
  const normalizedCause = cause.toUpperCase();
  return type === "PLANNED" || PROACTIVE_TERMS.some((term) => normalizedCause.includes(term)) ? "PROACTIVE" : "REACTIVE";
}
function parseBoolean(value) {
  return String(value).trim().toUpperCase() === "TRUE";
}
function parseNullableDate(value) {
  if (!value || String(value).toUpperCase() === "NULL") return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}
function normalizeEvent(row) {
  const id = String(row.id ?? "").trim();
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  const startMs = Date.parse(String(row.start_datetime ?? ""));
  if (!id) return { error: "missing id" };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return { error: `${id}: invalid latitude` };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { error: `${id}: invalid longitude` };
  if (!Number.isFinite(startMs)) return { error: `${id}: invalid start_datetime` };
  const endMs = parseNullableDate(row.end_datetime);
  const duration = Number(row.duration_minutes);
  const eventType = String(row.event_type ?? "UNKNOWN").trim();
  const cause = String(row.event_cause ?? "UNKNOWN").trim();
  return {
    event: {
      id,
      eventType,
      cause,
      address: String(row.address ?? "Unknown location").trim(),
      corridor: String(row.corridor ?? "Unknown corridor").trim(),
      junction: String(row.junction ?? "Unknown junction").trim(),
      latitude,
      longitude,
      startMs,
      endMs,
      startDatetime: new Date(startMs).toISOString(),
      endDatetime: endMs === null ? null : new Date(endMs).toISOString(),
      durationMinutes: Number.isFinite(duration) && duration >= 0 ? duration : null,
      severe: parseBoolean(row.is_severe),
      requiresRoadClosure: parseBoolean(row.requires_road_closure),
      status: String(row.status ?? "UNKNOWN").trim().toUpperCase(),
      paradigm: classifyParadigm(eventType, cause),
      dashCategory: dashCategoryOf(cause)
    }
  };
}
function haversineKm(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function classifyUrgency(event, nowMs, imminentHours = 168) {
  if (event.startMs <= nowMs && (event.endMs === null || event.endMs > nowMs)) return "CURRENT";
  const hoursUntilStart = (event.startMs - nowMs) / 36e5;
  if (hoursUntilStart <= 24 && hoursUntilStart >= 0) return "CURRENT";
  if (hoursUntilStart <= imminentHours) return "IMMINENT";
  return "UPCOMING";
}
function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function inferRoadProfile(event) {
  const descriptor = `${event.address} ${event.corridor}`.toUpperCase();
  if (/EXPRESSWAY|NICE ROAD|NATIONAL HIGHWAY|NH\s?\d/.test(descriptor)) {
    return { classification: "EXPRESSWAY", totalLanes: 6, speedKmh: 80, laneWidthM: 3.5, capacityPerLaneVph: 1900, confidence: 0.68, source: "SIMULATION_INFERENCE" };
  }
  if (/HIGHWAY|OUTER RING|ORR|RING ROAD|ARTERIAL|TUMKUR ROAD|HOSUR ROAD/.test(descriptor)) {
    return { classification: "ARTERIAL", totalLanes: 6, speedKmh: 60, laneWidthM: 3.5, capacityPerLaneVph: 1750, confidence: 0.64, source: "SIMULATION_INFERENCE" };
  }
  if (/MAIN ROAD|DOUBLE ROAD|CORRIDOR|100 FEET|80 FEET|60 FEET/.test(descriptor)) {
    return { classification: "COLLECTOR", totalLanes: 4, speedKmh: 40, laneWidthM: 3.25, capacityPerLaneVph: 1450, confidence: 0.55, source: "SIMULATION_INFERENCE" };
  }
  return { classification: "LOCAL", totalLanes: 2, speedKmh: 30, laneWidthM: 3, capacityPerLaneVph: 1050, confidence: 0.42, source: "SIMULATION_INFERENCE" };
}
function historicalMatch(event, historical2, radiusKm) {
  const matches = historical2.filter(
    (candidate) => candidate.id !== event.id && candidate.startMs < event.startMs && candidate.dashCategory === event.dashCategory && haversineKm(event.latitude, event.longitude, candidate.latitude, candidate.longitude) <= radiusKm
  );
  const durations = matches.map((candidate) => candidate.durationMinutes).filter((value) => value !== null).sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  const median = durations.length === 0 ? null : durations.length % 2 ? durations[middle] : Math.round((durations[middle - 1] + durations[middle]) / 2);
  const times = matches.map((candidate) => candidate.startMs).sort((a, b) => a - b);
  return {
    count: matches.length,
    severeCount: matches.filter((candidate) => candidate.severe).length,
    medianDurationMinutes: median,
    radiusKm,
    observationStart: times.length ? new Date(times[0]).toISOString() : null,
    observationEnd: times.length ? new Date(times[times.length - 1]).toISOString() : null
  };
}
function buildIntelligence(event, historical2, config) {
  const road = inferRoadProfile(event);
  const history = historicalMatch(event, historical2, config.historicalRadiusKm);
  const cause = event.cause.toUpperCase();
  const weatherFactor = /WATER|RAIN|MONSOON|FLOOD/.test(cause) ? 0.78 : 1;
  const closurePressure = event.requiresRoadClosure ? 2 : 0;
  const physicalPressure = /FLOOD|WATER|TREE|ACCIDENT|CONSTRUCTION|CAVE/.test(cause) ? 2 : 1;
  const lanesBlocked = Math.min(road.totalLanes, Math.max(1, closurePressure, physicalPressure, event.severe ? 2 : 1));
  const openLanes = Math.max(0, road.totalLanes - lanesBlocked);
  const demandFactor = 0.72 + stableHash(`${config.seed}:${event.id}`) % 37 / 100;
  const baselineDemandVph = Math.round(road.totalLanes * road.capacityPerLaneVph * demandFactor);
  const residualCapacityVph = Math.round(openLanes * road.capacityPerLaneVph * weatherFactor);
  const queueGrowthVph = Math.max(0, baselineDemandVph - residualCapacityVph);
  const queueGrowthVehiclesPerMinute = Number((queueGrowthVph / 60).toFixed(1));
  const densityFree = Math.max(18, baselineDemandVph / Math.max(road.speedKmh, 1));
  const densityCongested = Math.max(densityFree + 20, 135 * Math.max(openLanes, 1));
  const shockwaveKmh = queueGrowthVph === 0 ? 0 : Number(((residualCapacityVph - baselineDemandVph) / (densityCongested - densityFree)).toFixed(1));
  const taperLengthMeters = Math.ceil(road.laneWidthM * road.speedKmh ** 2 / 155 / 10) * 10;
  const deviceSpacingMeters = Math.max(5, Math.min(10, Math.round(road.speedKmh / 8)));
  const barricadesRequired = Math.ceil(taperLengthMeters / deviceSpacingMeters) + 2;
  const decisionLeadSeconds = 30 + road.speedKmh * 0.75;
  const queueProtectionMeters = queueGrowthVph === 0 ? 0 : Math.min(900, queueGrowthVehiclesPerMinute * 12 * 5);
  const upstreamDistanceMeters = Math.round(Math.min(1500, Math.max(250, road.speedKmh / 3.6 * decisionLeadSeconds + queueProtectionMeters)) / 50) * 50;
  const controlPoints = 1 + (lanesBlocked > 1 ? 1 : 0) + (queueGrowthVph > 0 ? 2 : 0);
  const officersRequired = 1 + controlPoints + (event.severe ? 2 : 0) + (/VIP|PROTEST|RALLY/.test(cause) ? 2 : 0);
  const diversionDemandVph = Math.min(queueGrowthVph, Math.round(baselineDemandVph * 0.35));
  const simulatedAlternateResidualVph = Math.round(road.capacityPerLaneVph * 1.2 * weatherFactor);
  const alternateUtilization = simulatedAlternateResidualVph === 0 ? 1 : diversionDemandVph / simulatedAlternateResidualVph;
  const diversionSafe = diversionDemandVph > 0 && alternateUtilization <= 0.85;
  const confidence = Number(Math.min(0.86, road.confidence * 0.55 + Math.min(history.count, 20) / 100 + 0.18).toFixed(2));
  const location = event.address.split(",")[0] || event.address;
  const corridor = event.corridor !== "Unknown corridor" ? event.corridor : location;
  return {
    status: "success",
    eventId: event.id,
    event_cause: event.cause,
    paradigm: event.paradigm,
    location: event.address,
    historical_frequency: `${history.count} verified matching events within ${history.radiusKm} km`,
    historical_evidence: history,
    tactical_deployment: {
      officers_required: officersRequired,
      barricades_required: barricadesRequired,
      rationale: `${officersRequired} officers cover incident command and ${controlPoints} simulated control points; ${barricadesRequired} devices cover a ${taperLengthMeters}m simulation taper.`
    },
    signal_gating_protocol: {
      status: queueGrowthVph > 0 ? "RECOMMENDED_FOR_OPERATOR_REVIEW" : "MONITOR",
      upstream_node: event.junction !== "Unknown junction" ? event.junction : `${location} upstream decision node`,
      action: queueGrowthVph > 0 ? `Meter release to at most ${residualCapacityVph} veh/hr; preserve statutory pedestrian and emergency phases.` : "Maintain plan and monitor downstream occupancy.",
      rationale: `Simulated demand ${baselineDemandVph} veh/hr versus residual incident capacity ${residualCapacityVph} veh/hr. No autonomous signal command is issued.`
    },
    lane_blockage_instructions: {
      lanes_to_close: lanesBlocked,
      total_lanes: road.totalLanes,
      closure_pattern: `${lanesBlocked} lane${lanesBlocked === 1 ? "" : "s"} nearest the reported obstruction; field confirmation required`,
      taper_length_meters: taperLengthMeters,
      rationale: `${road.classification} profile inferred at ${road.speedKmh} km/h; device spacing ${deviceSpacingMeters}m under the PRAVAH simulation safety policy.`
    },
    diversion_protocol: {
      upstream_diversion_point: `${corridor} decision junction approximately ${upstreamDistanceMeters}m upstream`,
      distance_upstream_meters: upstreamDistanceMeters,
      alternate_route: diversionSafe ? `Simulated parallel arterial for ${corridor}` : "No capacity-safe alternate established",
      alternate_route_capacity: `${simulatedAlternateResidualVph} veh/hr simulated residual; ${Math.round(alternateUtilization * 100)}% projected utilization`,
      rationale: diversionSafe ? `Divert up to ${diversionDemandVph} veh/hr, keeping simulated alternate utilization at or below 85%. Validate connectivity on the live road graph.` : "Hold diversion until a connected route passes residual-capacity and operator validation checks."
    },
    kinematic_state: {
      baseline_demand_vph: baselineDemandVph,
      residual_capacity_vph: residualCapacityVph,
      queue_growth_vehicles_per_minute: queueGrowthVehiclesPerMinute,
      shockwave_speed_kmh: shockwaveKmh,
      model: "Deterministic triangular fundamental-diagram simulation"
    },
    decision_metadata: {
      mode: "SIMULATION",
      confidence,
      seed: config.seed,
      model_version: "pravah-sim-2.0.0",
      generated_at: new Date(config.nowMs).toISOString(),
      requires_human_approval: true,
      assumptions: [
        "Road geometry is inferred from corridor text, not surveyed lane geometry.",
        "Demand is deterministic synthetic demand because live detector VPH is unavailable.",
        "Taper and device counts are simulation-policy outputs, not field engineering approval."
      ]
    }
  };
}

// server.ts
dotenv.config();
var app = express();
var PORT = Number(process.env.PORT ?? 3002);
var SIM_NOW = Date.parse(process.env.SIMULATION_NOW ?? "2024-03-25T00:00:00+05:30");
var CONFIG = {
  nowMs: SIM_NOW,
  historicalRadiusKm: Number(process.env.HISTORICAL_RADIUS_KM ?? 0.5),
  imminentHours: 168,
  seed: process.env.SIMULATION_SEED ?? "pravah-national-hackathon-2026"
};
var events = /* @__PURE__ */ new Map();
var historical = [];
var planned = [];
var simulationPool = [];
var rejectedRows = [];
var sseClients = /* @__PURE__ */ new Set();
var ready = false;
var simulationCursor = 0;
var sequence = 0;
var autoSimulationTimer = null;
var aiClient = null;
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  res.setHeader("cache-control", "no-store");
  next();
});
function formatEventName(cause) {
  return cause.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
function eventView(event) {
  return {
    eventId: event.id,
    event_name: formatEventName(event.cause),
    start_datetime: event.startDatetime,
    urgency: classifyUrgency(event, CONFIG.nowMs, CONFIG.imminentHours),
    is_severe: event.severe,
    dashCategory: event.dashCategory,
    lat: event.latitude,
    lng: event.longitude,
    type: event.paradigm,
    street: event.address.split(",")[0] || event.address,
    corridor: event.corridor
  };
}
function queryScope(req) {
  const supplied = [req.query.lat, req.query.lng, req.query.radiusKm].filter((value) => value !== void 0).length;
  if (supplied === 0) return null;
  if (supplied !== 3) throw new Error("lat, lng and radiusKm must be supplied together");
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("invalid lat");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("invalid lng");
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) throw new Error("radiusKm must be between 0 and 100");
  return { lat, lng, radiusKm };
}
function isInScope(event, scope) {
  return scope === null || haversineKm(event.latitude, event.longitude, scope.lat, scope.lng) <= scope.radiusKm;
}
async function loadDataset() {
  const csvPath = path.join(process.cwd(), "cleaned_astram_events.csv");
  if (!fs.existsSync(csvPath)) throw new Error(`Dataset not found: ${csvPath}`);
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath).pipe(csv()).on("data", (row) => {
      const normalized = normalizeEvent(row);
      if (!normalized.event) {
        if (rejectedRows.length < 100) rejectedRows.push(normalized.error ?? "unknown validation error");
        return;
      }
      if (events.has(normalized.event.id)) {
        if (rejectedRows.length < 100) rejectedRows.push(`${normalized.event.id}: duplicate id`);
        return;
      }
      const event = normalized.event;
      events.set(event.id, event);
      if (event.startMs < CONFIG.nowMs) historical.push(event);
      else if (event.paradigm === "PROACTIVE") planned.push(event);
      else simulationPool.push(event);
    }).on("end", resolve).on("error", reject);
  });
  historical.sort((a, b) => a.startMs - b.startMs);
  planned.sort((a, b) => a.startMs - b.startMs);
  simulationPool.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  ready = true;
  console.log(JSON.stringify({
    level: "info",
    message: "dataset_ready",
    total: events.size,
    historical: historical.length,
    planned: planned.length,
    simulationPool: simulationPool.length,
    rejected: rejectedRows.length,
    simulationNow: new Date(CONFIG.nowMs).toISOString()
  }));
}
function clusterEvents(source, category, scope) {
  const buckets = /* @__PURE__ */ new Map();
  for (const event of source) {
    if (event.dashCategory !== category || !isInScope(event, scope)) continue;
    const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(event);
    buckets.set(key, bucket);
  }
  const rank = { CURRENT: 3, IMMINENT: 2, UPCOMING: 1 };
  return [...buckets.entries()].map(([clusterId, bucket]) => {
    const views = bucket.map(eventView).sort((a, b) => Date.parse(a.start_datetime) - Date.parse(b.start_datetime));
    const peak = views.reduce(
      (best, item) => rank[item.urgency] > rank[best] ? item.urgency : best,
      "UPCOMING"
    );
    return {
      clusterId,
      latitude: bucket.reduce((sum, event) => sum + event.latitude, 0) / bucket.length,
      longitude: bucket.reduce((sum, event) => sum + event.longitude, 0) / bucket.length,
      location_name: bucket[0].address.split(",")[0] || bucket[0].address,
      peak_urgency: peak,
      event_count: bucket.length,
      events: views.slice(0, 6)
    };
  }).sort((a, b) => rank[b.peak_urgency] - rank[a.peak_urgency] || b.event_count - a.event_count).slice(0, 20);
}
function chronicHotspots(scope) {
  const buckets = /* @__PURE__ */ new Map();
  for (const event of historical) {
    if (!isInScope(event, scope)) continue;
    const key = `${event.dashCategory}:${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(event);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((bucket) => {
    const durations = bucket.map((event) => event.durationMinutes).filter((value) => value !== null).sort((a, b) => a - b);
    const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
    return {
      eventId: bucket[0].id,
      location_name: bucket[0].address.split(",")[0] || bucket[0].address,
      latitude: bucket.reduce((sum, event) => sum + event.latitude, 0) / bucket.length,
      longitude: bucket.reduce((sum, event) => sum + event.longitude, 0) / bucket.length,
      event_count: bucket.length,
      total_severity: bucket.reduce((sum, event) => sum + (event.severe ? 3 : 1), 0),
      duration_minutes: median,
      median_duration_minutes: median,
      dashCategory: bucket[0].dashCategory,
      aggregation_cell_meters: 100
    };
  }).sort((a, b) => b.event_count - a.event_count);
}
function categorySummary(scope) {
  const result = { WEATHER: 0, INCIDENTS: 0, CIVIC_WORKS: 0, EVENTS_VIPS: 0, SIGNAL_FAILURES: 0 };
  const names = { weather: "WEATHER", incidents: "INCIDENTS", civic_works: "CIVIC_WORKS", events_vips: "EVENTS_VIPS", signal_failures: "SIGNAL_FAILURES" };
  for (const event of planned) if (isInScope(event, scope)) result[names[event.dashCategory] ?? "INCIDENTS"] += 1;
  return result;
}
function nextSimulatedEvent() {
  if (!simulationPool.length) return null;
  const event = simulationPool[simulationCursor % simulationPool.length];
  simulationCursor += 1;
  sequence += 1;
  return { sequence, emitted_at: (/* @__PURE__ */ new Date()).toISOString(), simulation_time: new Date(CONFIG.nowMs).toISOString(), event: eventView(event) };
}
function broadcastSimulation() {
  const payload = nextSimulatedEvent();
  if (!payload) return null;
  const frame = `id: ${payload.sequence}
event: astram.incident
data: ${JSON.stringify(payload)}

`;
  for (const client of sseClients) client.write(frame);
  return payload;
}
app.get("/api/health", (_req, res) => res.json({ status: "alive", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.get("/api/ready", (_req, res) => res.status(ready ? 200 : 503).json({
  status: ready ? "ready" : "loading",
  total_events: events.size,
  rejected_rows: rejectedRows.length,
  model_version: "pravah-sim-2.0.0"
}));
app.use("/api/v1", (_req, res, next) => ready ? next() : res.status(503).json({ error: "Dataset is still loading" }));
app.get("/api/v1/grid/chronic-hotspots", (req, res) => {
  try {
    const scope = queryScope(req);
    const hotspots = chronicHotspots(scope);
    const topByCategory = ["weather", "incidents", "civic_works", "events_vips", "signal_failures"].flatMap((category) => hotspots.filter((item) => item.dashCategory === category).slice(0, 3));
    res.json({ status: "success", total_events_ingested: events.size, chronic_hotspots: topByCategory, category_summary: categorySummary(scope) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});
app.get("/api/v1/grid/layer/:category", (req, res) => {
  try {
    const allowed = /* @__PURE__ */ new Set(["weather", "incidents", "civic_works", "events_vips", "signal_failures"]);
    if (!allowed.has(req.params.category)) return res.status(400).json({ error: "Unknown layer category" });
    res.json({ status: "success", layer: req.params.category, clusters: clusterEvents(planned, req.params.category, queryScope(req)) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});
app.get("/api/v1/grid/state", (req, res) => {
  try {
    const scope = queryScope(req);
    const hotspots = chronicHotspots(scope);
    const layers = Object.fromEntries(["weather", "incidents", "civic_works", "events_vips", "signal_failures"].map((category) => [category, clusterEvents(planned, category, scope)]));
    res.json({
      status: "success",
      simulation: { mode: "DETERMINISTIC_REPLAY", now: new Date(CONFIG.nowMs).toISOString(), seed: CONFIG.seed, model_version: "pravah-sim-2.0.0" },
      total_events_ingested: events.size,
      chronic_hotspots: hotspots.slice(0, 25),
      category_summary: categorySummary(scope),
      layers,
      data_quality: { accepted: events.size, rejected: rejectedRows.length }
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});
app.get("/api/v1/event/:eventId/intelligence", (req, res) => {
  const event = events.get(req.params.eventId);
  if (!event) return res.status(404).json({ error: "Event ID not found" });
  res.json(buildIntelligence(event, historical, CONFIG));
});
app.get("/api/v1/simulation/unplanned", (_req, res) => {
  res.json({ status: "success", mode: "server_stream_available", events: simulationPool.slice(0, 50).map(eventView) });
});
app.get("/api/v1/events/stream", (req, res) => {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  res.write(`event: connected
data: ${JSON.stringify({ mode: "SIMULATION", model_version: "pravah-sim-2.0.0" })}

`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});
app.post("/api/v1/simulate/astram", (_req, res) => {
  const payload = broadcastSimulation();
  if (!payload) return res.status(409).json({ error: "Simulation pool is empty" });
  res.status(202).json({ status: "broadcast", ...payload });
});
function getAiClient() {
  if (aiClient) return aiClient;
  if (!process.env.GEMINI_API_KEY) throw new Error("AI strategy service is not configured");
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return aiClient;
}
app.post("/api/strategy", async (req, res) => {
  const density = Number(req.body?.density);
  const velocity = Number(req.body?.velocity);
  const officersAvailable = Number(req.body?.officersAvailable);
  if (![density, velocity, officersAvailable].every(Number.isFinite)) {
    return res.status(400).json({ success: false, error: "density, velocity and officersAvailable must be numeric" });
  }
  try {
    const result = await getAiClient().models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: `Create a simulation-only traffic response advisory. Density=${density} veh/km, speed=${velocity} km/h, officers=${officersAvailable}. Clearly distinguish supplied values, assumptions, and recommendations. Never claim to issue a signal, navigation, or police command. Return three concise Markdown sections.`,
      config: { temperature: 0.1, systemInstruction: "You are a decision-support analyst. Output is advisory, simulation-only, and always requires human authorization." }
    });
    res.json({ success: true, protocol: result.text, mode: "SIMULATION_ADVISORY", requires_human_approval: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "strategy_generation_failed", detail: error instanceof Error ? error.message : "unknown" }));
    res.status(503).json({ success: false, error: "Strategy generation is temporarily unavailable" });
  }
});
async function start() {
  await loadDataset();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`PRAVAH simulation engine listening on http://localhost:${PORT}`);
    autoSimulationTimer = setInterval(() => {
      if (sseClients.size) broadcastSimulation();
    }, Number(process.env.SIMULATION_INTERVAL_MS ?? 5e3));
  });
  const shutdown = () => {
    if (autoSimulationTimer) clearInterval(autoSimulationTimer);
    for (const client of sseClients) client.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5e3).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
start().catch((error) => {
  console.error(JSON.stringify({ level: "fatal", message: "startup_failed", detail: error instanceof Error ? error.message : "unknown" }));
  process.exit(1);
});
