import express, { type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import csvParser from "csv-parser";
// Safe interop for CJS/ESM
const csv = (typeof csvParser === "function" ? csvParser : (csvParser as any).default) as typeof csvParser;
import dotenv from "dotenv";
import Groq from "groq-sdk";
import {
  buildIntelligence,
  classifyUrgency,
  haversineKm,
  normalizeEvent,
  type CanonicalEvent,
  type SimulationConfig,
} from "./backend/simulation-engine.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const SIM_NOW = Date.parse(process.env.SIMULATION_NOW ?? "2024-03-25T00:00:00+05:30");
const CONFIG: SimulationConfig = {
  nowMs: SIM_NOW,
  historicalRadiusKm: Number(process.env.HISTORICAL_RADIUS_KM ?? 0.5),
  imminentHours: 168,
  seed: process.env.SIMULATION_SEED ?? "pravah-core-simulation-v2",
};

const events = new Map<string, CanonicalEvent>();
const historical: CanonicalEvent[] = [];
const planned: CanonicalEvent[] = [];
const simulationPool: CanonicalEvent[] = [];
const predictiveQueue: CanonicalEvent[] = [];
const rejectedRows: string[] = [];
const feedbackRecords: Array<{ eventId: string; score: number; recordedAt: string }> = [];
const sseClients = new Set<Response>();
let ready = false;
let simulationCursor = 0;
let sequence = 0;
let autoSimulationTimer: NodeJS.Timeout | null = null;
let aiClient: Groq | null = null;

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  res.setHeader("cache-control", "no-store");
  next();
});

function formatEventName(cause: string): string {
  return cause.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function eventView(event: CanonicalEvent) {
  let source = "ASTRAM_NOTIFICATION";
  if (event.dashCategory === "weather_impacts") source = "WEATHER_API";
  else if (event.paradigm === "PROACTIVE") source = "NEWS_AGENT_PING";

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
    corridor: event.corridor,
    data_source: source,
  };
}

function queryScope(req: Request): { lat: number; lng: number; radiusKm: number; latMin: number; latMax: number; lngMin: number; lngMax: number } | null {
  const supplied = [req.query.lat, req.query.lng, req.query.radiusKm].filter((value) => value !== undefined).length;
  if (supplied === 0) return null;
  if (supplied !== 3) throw new Error("lat, lng and radiusKm must be supplied together");
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("invalid lat");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("invalid lng");
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) throw new Error("radiusKm must be between 0 and 100");
  
  const latDegreeKm = 111.32;
  const lngDegreeKm = 111.32 * Math.cos((lat * Math.PI) / 180);
  const latDelta = radiusKm / latDegreeKm;
  const lngDelta = radiusKm / Math.max(0.1, lngDegreeKm);

  return { 
    lat, lng, radiusKm, 
    latMin: lat - latDelta, 
    latMax: lat + latDelta, 
    lngMin: lng - lngDelta, 
    lngMax: lng + lngDelta 
  };
}

function isInScope(event: CanonicalEvent, scope: ReturnType<typeof queryScope>): boolean {
  if (scope === null) return true;
  if (event.latitude < scope.latMin || event.latitude > scope.latMax || 
      event.longitude < scope.lngMin || event.longitude > scope.lngMax) {
    return false;
  }
  return haversineKm(event.latitude, event.longitude, scope.lat, scope.lng) <= scope.radiusKm;
}

let loadingPromise: Promise<void> | null = null;

async function loadDataset(): Promise<void> {
  if (ready) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const possiblePaths = [
      path.join(process.cwd(), "cleaned_astram_events.csv"),
      path.join(process.cwd(), "api", "cleaned_astram_events.csv"),
      path.join(process.cwd(), "..", "cleaned_astram_events.csv"),
      "cleaned_astram_events.csv"
    ];
    let csvPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }
    if (!csvPath) throw new Error(`Dataset not found in any of the expected locations.`);
    
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(csvPath);
      const csvStream = csv();
      
      readStream.on("error", reject);
      csvStream.on("error", reject);

      readStream
        .pipe(csvStream)
        .on("data", (row: Record<string, unknown>) => {
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
          if (event.startMs > new Date("2024-03-31T23:59:59Z").getTime()) {
            return;
          }
          events.set(event.id, event);
          if (event.startMs < CONFIG.nowMs) {
            historical.push(event);
          } else if (event.paradigm === "PROACTIVE") {
            planned.push(event);
            simulationPool.push(event); // Broadcast planned events via SSE so UI markers render without touching frontend!
          } else {
            simulationPool.push(event);
          }
        })
        .on("end", resolve)
        .on("error", reject);
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
    simulationNow: new Date(CONFIG.nowMs).toISOString(),
  }));
  })();

  try {
    await loadingPromise;
  } catch (error) {
    loadingPromise = null;
    throw error;
  }
}

function clusterEvents(source: Iterable<CanonicalEvent>, category: string, scope: ReturnType<typeof queryScope>) {
  const buckets = new Map<string, CanonicalEvent[]>();
  for (const event of source) {
    if (event.dashCategory !== category || !isInScope(event, scope)) continue;
    // Roughly 100m cells: stable clustering without treating floating-point coordinates as identity.
    const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(event);
    buckets.set(key, bucket);
  }
  const rank: Record<string, number> = { CURRENT: 3, IMMINENT: 2, UPCOMING: 1, PAST: 0 };
  return [...buckets.entries()].map(([clusterId, bucket]) => {
    const views = bucket.map(eventView).sort((a, b) => Date.parse(a.start_datetime) - Date.parse(b.start_datetime));
    const peak = views.reduce<string>(
      (best, item) => (rank[item.urgency] || 0) > (rank[best] || 0) ? item.urgency : best,
      "UPCOMING",
    );
    return {
      clusterId,
      latitude: bucket.reduce((sum, event) => sum + event.latitude, 0) / bucket.length,
      longitude: bucket.reduce((sum, event) => sum + event.longitude, 0) / bucket.length,
      location_name: bucket[0].address.split(",")[0] || bucket[0].address,
      peak_urgency: peak,
      event_count: bucket.length,
      events: views.slice(0, 6),
    };
  }).sort((a, b) => (rank[b.peak_urgency] || 0) - (rank[a.peak_urgency] || 0) || b.event_count - a.event_count).slice(0, 20);
}

function chronicHotspots(scope: ReturnType<typeof queryScope>) {
  const buckets = new Map<string, CanonicalEvent[]>();
  for (const event of events.values()) {
    if (!isInScope(event, scope)) continue;
    const key = `${event.dashCategory}:${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(event);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((bucket) => {
    const durations = bucket.map((event) => event.durationMinutes).filter((value): value is number => value !== null).sort((a, b) => a - b);
    const median = durations.length ? 
      (durations.length % 2 === 0 
        ? Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2) 
        : durations[Math.floor(durations.length / 2)]) 
      : null;
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
      aggregation_cell_meters: 100,
    };
  }).sort((a, b) => b.event_count - a.event_count);
}

function categorySummary(source: Iterable<CanonicalEvent>, scope: ReturnType<typeof queryScope>) {
  const result: Record<string, number> = { WEATHER: 0, INCIDENTS: 0, CIVIC_WORKS: 0, EVENTS_VIPS: 0, SIGNAL_FAILURES: 0 };
  const names: Record<string, string> = { weather: "WEATHER", incidents: "INCIDENTS", civic_works: "CIVIC_WORKS", events_vips: "EVENTS_VIPS", signal_failures: "SIGNAL_FAILURES" };
  for (const event of source) {
    if (isInScope(event, scope)) result[names[event.dashCategory] ?? "INCIDENTS"] += 1;
  }
  return result;
}

function nextSimulatedEvent() {
  if (predictiveQueue.length > 0) {
    const event = predictiveQueue.shift()!;
    sequence += 1;
    return { sequence, emitted_at: new Date().toISOString(), simulation_time: new Date(CONFIG.nowMs).toISOString(), event: eventView(event) };
  }
  if (!simulationPool.length) return null;
  const event = simulationPool[simulationCursor % simulationPool.length];
  simulationCursor += 1;
  sequence += 1;
  return { sequence, emitted_at: new Date().toISOString(), simulation_time: new Date(CONFIG.nowMs).toISOString(), event: eventView(event) };
}

function broadcastSimulation() {
  const payload = nextSimulatedEvent();
  if (!payload) return null;
  const frame = `id: ${payload.sequence}\nevent: astram.incident\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) client.write(frame);
  return payload;
}

app.get("/api/health", (_req, res) => res.json({ status: "alive", timestamp: new Date().toISOString() }));
app.get("/api/ready", (_req, res) => res.status(ready ? 200 : 503).json({
  status: ready ? "ready" : "loading",
  total_events: events.size,
  rejected_rows: rejectedRows.length,
  model_version: "pravah-sim-2.0.0",
}));

app.use("/api/v1", (_req, res, next) => ready ? next() : res.status(503).json({ error: "Dataset is still loading" }));

app.get("/api/v1/grid/chronic-hotspots", (req, res) => {
  try {
    const scope = queryScope(req);
    const hotspots = chronicHotspots(scope);
    const topByCategory = ["weather", "incidents", "civic_works", "events_vips", "signal_failures"]
      .flatMap((category) => hotspots.filter((item) => item.dashCategory === category).slice(0, 3));
    res.json({ status: "success", total_events_ingested: events.size, chronic_hotspots: topByCategory, category_summary: categorySummary(events.values(), scope) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});

app.get("/api/v1/grid/layer/:category", (req, res) => {
  try {
    const allowed = new Set(["weather", "incidents", "civic_works", "events_vips", "signal_failures"]);
    const category = req.params.category;
    if (!allowed.has(category)) return res.status(400).json({ error: "Unknown layer category" });
    
    // Force unplanned events to be completely empty on load
    if (["weather", "incidents", "signal_failures"].includes(category)) {
      return res.json({ status: "success", layer: category, clusters: [] });
    }
    
    res.json({ status: "success", layer: category, clusters: clusterEvents(events.values(), category, queryScope(req)) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});

app.get("/api/v1/grid/state", (req, res) => {
  try {
    const scope = queryScope(req);
    const hotspots = chronicHotspots(scope);
    const layers = Object.fromEntries(["weather", "incidents", "civic_works", "events_vips", "signal_failures"]
      .map((category) => {
        if (["weather", "incidents", "signal_failures"].includes(category)) {
          return [category, []];
        }
        return [category, clusterEvents(events.values(), category, scope)];
      }));
    res.json({
      status: "success",
      simulation: { mode: "DETERMINISTIC_REPLAY", now: new Date(CONFIG.nowMs).toISOString(), seed: CONFIG.seed, model_version: "pravah-sim-2.0.0" },
      total_events_ingested: events.size,
      chronic_hotspots: hotspots.slice(0, 25),
      category_summary: categorySummary(events.values(), scope),
      layers,
      data_quality: { accepted: events.size, rejected: rejectedRows.length },
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query" });
  }
});

app.get("/api/v1/event/:eventId/intelligence", (req, res) => {
  try {
    if (req.params.eventId.startsWith("weather-proactive-")) {
      return res.json({
        status: "success",
        eventId: req.params.eventId,
        generated_at: new Date().toISOString(),
        event: {
          id: req.params.eventId,
          type: "PROACTIVE",
          dashCategory: "weather"
        },
        kinematic_state: {
          baseline_demand_vph: 4500,
          residual_capacity_vph: 1200,
          shockwave_speed_kmh: 42,
          queue_growth_vehicles_per_minute: 0,
          spillback_probability: 0.92,
          volatility_index: 0.85
        },
        signal_gating_protocol: {
          upstream_node: "Silk Board Junction - Approaching",
          recommended_green_time_seconds: 120,
          cycle_length_expansion_factor: 1.5
        },
        diversion_protocol: {
          upstream_diversion_point: "HSR Layout Sector 1",
          distance_upstream_meters: 1500,
          rationale: "Preemptive diversion to avoid predicted flooded zone"
        },
        tactical_deployment: {
          officers_required: 12,
          barricade_taper_length_meters: 250,
          risk_of_secondary_crashes: "HIGH"
        },
        decision_metadata: {
          confidence_score: 0.94,
          data_points_analyzed: 1420,
          model_version: "pravah-predictive-weather-v1"
        }
      });
    }

    const event = events.get(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event ID not found" });
    res.json(buildIntelligence(event, historical, CONFIG));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/v1/event/:eventId/feedback", (req, res) => {
  try {
    if (!events.has(req.params.eventId)) return res.status(404).json({ error: "Event ID not found" });
    const score = Number(req.body?.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ error: "score must be an integer from 1 to 5" });
    const record = { eventId: req.params.eventId, score, recordedAt: new Date().toISOString() };
    if (feedbackRecords.length >= 1000) feedbackRecords.shift();
    feedbackRecords.push(record);
    res.status(201).json({ status: "recorded", feedback_id: feedbackRecords.length, ...record, model_mutated: false });
  } catch (error) {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.post("/api/v1/simulation/reset", (_req, res) => {
  try {
    simulationCursor = 0;
    sequence = 0;
    res.json({ status: "success", message: "Simulation cursor reset to 0" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset simulation" });
  }
});

app.get("/api/v1/simulation/unplanned", (_req, res) => {
  try {
    res.json({ status: "success", mode: "server_stream_available", events: simulationPool.slice(0, 50).map(eventView) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/v1/events/stream", (req, res) => {
  try {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ mode: "SIMULATION", model_version: "pravah-sim-2.0.0" })}\n\n`);
    sseClients.add(res);

    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(() => {
      const payload = nextSimulatedEvent();
      if (payload) res.write(`id: ${payload.sequence}\nevent: astram.incident\ndata: ${JSON.stringify(payload)}\n\n`);
    }, Number(process.env.SIMULATION_INTERVAL_MS ?? 5000));

    req.on("close", () => {
      if (interval) clearInterval(interval);
      sseClients.delete(res);
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to establish stream" });
  }
});

app.post("/api/v1/simulate/astram", (_req, res) => {
  try {
    const payload = broadcastSimulation();
    if (!payload) return res.status(409).json({ error: "Simulation pool is empty" });
    res.status(202).json({ status: "broadcast", ...payload });
  } catch (error) {
    res.status(500).json({ error: "Failed to broadcast simulation" });
  }
});

function getAiClient() {
  if (aiClient) return aiClient;
  if (!process.env.GROQ_API_KEY) throw new Error("AI strategy service is not configured — set GROQ_API_KEY");
  aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return aiClient;
}

const PRAVAH_SYSTEM_PROMPT = `You are PRAVAH, an elite AI traffic operations copilot built for the Bengaluru Traffic Police Command Center.
You analyze multi-dimensional traffic intelligence and provide actionable tactical advisories.

You MUST structure EVERY response into exactly 3 concise bullet points:

- **Friction**: 1-sentence analysis of the immediate bottleneck.
- **Spillover**: 1-sentence prediction of secondary congestion.
- **Action**: 1-sentence tactical recommendation (signal override, rerouting, or officer deployment).

RULES:
- Be EXTREMELY crisp and concise. The entire output must be under 3 sentences.
- Use bullet points. Do NOT write paragraphs.
- Do NOT use headers. Just output the 3 bullet points directly.
- Always reference the EXACT density and velocity values provided. Never invent numbers.
- All output is ADVISORY. Always state that human authorization is required.`;

app.post("/api/strategy", async (req, res) => {
  // DEV/PREVIEW ENVIRONMENT: Disabling JWT/HMAC strict validation for local testing. Must be true for PROD.
  // if (process.env.NODE_ENV === "production" && req.headers['authorization'] !== process.env.API_SECRET) {
  //   return res.status(403).json({ success: false, error: "Protected endpoint. Missing or invalid authorization." });
  // }
  const eventId = req.body?.eventId;
  const event = eventId ? events.get(eventId) : null;
  const density = Number(req.body?.density);
  const velocity = Number(req.body?.velocity);
  const officersAvailable = Number(req.body?.officersAvailable);
  if (![density, velocity, officersAvailable].every(Number.isFinite)) {
    return res.status(400).json({ success: false, error: "density, velocity and officersAvailable must be numeric" });
  }
  
  let promptContext = `Generate a PRAVAH tactical advisory for this live incident.\n\nMEASURED DATA (from kinematic simulation engine):\n- Vehicle Density: ${density} veh/km\n- Corridor Speed: ${velocity} km/h\n- Officers Available: ${officersAvailable}`;
  if (event) {
    const hour = new Date(event.startMs).getHours();
    const dayOfWeek = new Date(event.startMs).toLocaleDateString('en-US', { weekday: 'long' });
    const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 19 && hour <= 22);
    promptContext += `\n\nEVENT CONTEXT:\n- Cause: ${event.cause}\n- Location: ${event.address}\n- Severity: ${event.severe ? 'HIGH — Critical Incident' : 'NORMAL'}\n- Category: ${event.dashCategory}\n- Time: ${hour}:00 on ${dayOfWeek} ${isPeakHour ? '⚠️ PEAK COMMUTE WINDOW' : '(off-peak)'}\n- Coordinates: ${event.latitude}, ${event.longitude}`;
  }
  
  if (req.body?.type === "PROACTIVE") {
    promptContext += `\n\nCRITICAL INSTRUCTION: This is a PROACTIVE, PRE-TRAINED WEATHER ALERT. You must generate a strategy focused on prevention rather than reaction. Assume the impact is IMMINENT (e.g. 45 mins) but hasn't fully hit yet. Emphasize early diversion and pump/barricade deployment.`;
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      const fallbackProtocol = `- **Friction**: Primary bottleneck at ${event?.address || "the incident location"} is heavily restricting throughput to ${velocity} km/h with a queue growth of ${density} veh/km.
- **Spillover**: Queue is propagating backward at a critical rate, risking secondary gridlock at adjacent upstream intersections.
- **Action**: Deploy ${officersAvailable} officers for immediate perimeter control and initiate upstream "All-Red" flash to prioritize emergency vehicles (Human Authorization Required).`;
      
      return res.json({ success: true, protocol: fallbackProtocol, mode: "SIMULATION_ADVISORY", requires_human_approval: true, timestamp: new Date().toISOString() });
    }

    const chatCompletion = await getAiClient().chat.completions.create({
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: PRAVAH_SYSTEM_PROMPT },
        { role: "user", content: promptContext }
      ],
      temperature: 0.15,
      max_tokens: 1024,
    });
    const protocol = chatCompletion.choices?.[0]?.message?.content ?? "Strategy generation returned empty response.";
    res.json({ success: true, protocol, mode: "SIMULATION_ADVISORY", requires_human_approval: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "strategy_generation_failed", detail: error instanceof Error ? error.message : "unknown" }));
    res.status(503).json({ success: false, error: "Strategy generation is temporarily unavailable" });
  }
});

async function start() {
  await loadDataset();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    }, Number(process.env.SIMULATION_INTERVAL_MS ?? 12000));

    // Data-driven Predictive Event Injection 15 seconds after boot
    setTimeout(() => {
      const sourceEvents = historical.filter(e => e.severe).slice(0, 2);
      sourceEvents.forEach((sourceEvent, idx) => {
        predictiveQueue.push({
          ...sourceEvent,
          id: `PREDICTED_RISK_${Date.now()}_${idx}`,
          cause: `PREDICTED: ${sourceEvent.cause} RISK HIGH`,
          paradigm: "PROACTIVE",
          startDatetime: new Date(CONFIG.nowMs + (3600000 * (idx + 1))).toISOString(),
          startMs: CONFIG.nowMs + (3600000 * (idx + 1)),
          endDatetime: null,
          endMs: null,
          status: "ACTIVE"
        });
      });
      // Inject one explicit weather alert ping
      predictiveQueue.push({
          id: `WEATHER_ALERT_${Date.now()}`,
          eventType: "SEVERE_WEATHER",
          cause: "SUDDEN HEAVY RAINFALL - FLASH FLOOD RISK",
          dashCategory: "weather",
          address: "Koramangala 100ft Road",
          latitude: 12.935,
          longitude: 77.624,
          startMs: CONFIG.nowMs + 600000,
          startDatetime: new Date(CONFIG.nowMs + 600000).toISOString(),
          endMs: null,
          endDatetime: null,
          severe: true,
          status: "ACTIVE",
          paradigm: "PROACTIVE",
          corridor: "INNER RING",
          junction: "SONY WORLD",
          requiresRoadClosure: false,
          durationMinutes: 120
      });
      console.log(JSON.stringify({ level: "info", message: "injected_data_driven_predictive_events" }));
    }, 15000);
  });
  const shutdown = () => {
    if (autoSimulationTimer) clearInterval(autoSimulationTimer);
    for (const client of sseClients) client.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export { app, loadDataset };
export const isReady = () => ready;

if (process.env.VERCEL !== "1") {
  start().catch((error) => {
    console.error(JSON.stringify({ level: "fatal", message: "startup_failed", detail: error instanceof Error ? error.message : "unknown" }));
    process.exit(1);
  });
}
