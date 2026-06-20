/**
 * PRAVAH — Phase I: Relational Schema & Categorization
 * 
 * In-memory representation of the traffic_events table with
 * automatic pravah_category and severity_index assignment.
 * 
 * In production this would be a MySQL/PostgreSQL table with
 * ALTER TABLE + UPDATE triggers. Here we simulate the exact
 * same logic in TypeScript for the Node.js runtime.
 */

/* ─── Raw Event Types (as they arrive from CSV/feed) ─── */
export type EventCause =
  | "WATER_LOGGING"
  | "PUBLIC_EVENT" | "PROCESSION" | "PROTEST"
  | "VIP_MOVEMENT"
  | "CONSTRUCTION" | "ROAD_CONDITIONS" | "POT_HOLES"
  | "ACCIDENT" | "VEHICLE_BREAKDOWN" | "TREE_FALL" | "DEBRIS" | "CONGESTION"
  | "SIGNAL_FAILURE" | "OTHER";

export type EventType = "PLANNED" | "UNPLANNED";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type PravahCategory = "MONSOON" | "RALLY_OR_GATHERING" | "VIP" | "CIVIC_WORK" | "BLOCKAGE" | "OTHER";

/* ─── The Core Traffic Event Record ─── */
export interface TrafficEvent {
  id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  event_cause: EventCause;
  event_type: EventType;
  priority: Priority;
  requires_road_closure: boolean;
  duration_minutes: number;
  timestamp: string;

  // Phase I computed columns
  pravah_category: PravahCategory;
  severity_index: number;
}

/* ─── Phase I: Categorization Logic ─── */
/* Mirrors:
   CASE WHEN event_cause = 'WATER_LOGGING' THEN 'MONSOON'
        WHEN event_cause IN ('PUBLIC_EVENT','PROCESSION','PROTEST') THEN 'RALLY_OR_GATHERING'
        WHEN event_cause = 'VIP_MOVEMENT' THEN 'VIP'
        WHEN event_cause IN ('CONSTRUCTION','ROAD_CONDITIONS','POT_HOLES') THEN 'CIVIC_WORK'
        WHEN event_cause IN ('ACCIDENT','VEHICLE_BREAKDOWN','TREE_FALL','DEBRIS','CONGESTION') THEN 'BLOCKAGE'
        ELSE 'OTHER' END
*/
function categorize(cause: EventCause): PravahCategory {
  switch (cause) {
    case "WATER_LOGGING": return "MONSOON";
    case "PUBLIC_EVENT": case "PROCESSION": case "PROTEST": return "RALLY_OR_GATHERING";
    case "VIP_MOVEMENT": return "VIP";
    case "CONSTRUCTION": case "ROAD_CONDITIONS": case "POT_HOLES": return "CIVIC_WORK";
    case "ACCIDENT": case "VEHICLE_BREAKDOWN": case "TREE_FALL": case "DEBRIS": case "CONGESTION": return "BLOCKAGE";
    default: return "OTHER";
  }
}

/* ─── Phase I: Severity Index ─── */
/* Mirrors:
   (CASE WHEN priority = 'HIGH' THEN 5 ELSE 1 END) +
   (CASE WHEN requires_road_closure = 'TRUE' THEN 5 ELSE 0 END)
*/
function computeSeverity(priority: Priority, roadClosure: boolean): number {
  return (priority === "HIGH" ? 5 : 1) + (roadClosure ? 5 : 0);
}

/* ─── Helper: create an event with auto-computed fields ─── */
let _eventId = 0;
function ev(
  location_name: string, latitude: number, longitude: number,
  event_cause: EventCause, event_type: EventType,
  priority: Priority, requires_road_closure: boolean,
  duration_minutes: number, timestamp: string
): TrafficEvent {
  return {
    id: ++_eventId,
    location_name, latitude, longitude,
    event_cause, event_type, priority,
    requires_road_closure, duration_minutes, timestamp,
    pravah_category: categorize(event_cause),
    severity_index: computeSeverity(priority, requires_road_closure),
  };
}

/* ════════════════════════════════════════════════════════════
   SEED DATA — ~120 realistic Bengaluru traffic events
   These simulate ingested CSV rows with automatic
   pravah_category + severity_index assignment
   ════════════════════════════════════════════════════════════ */

export const TRAFFIC_EVENTS: TrafficEvent[] = [
  // ── MONSOON / WATER_LOGGING ──
  ev("Bellandur ORR Underpass",      12.9279, 77.6801, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  180, "2026-06-18T06:30:00Z"),
  ev("Silk Board Underpass",         12.9176, 77.6228, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  240, "2026-06-18T05:45:00Z"),
  ev("KR Puram Railway Underpass",   12.9936, 77.6751, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  150, "2026-06-18T07:00:00Z"),
  ev("Koramangala Sony Signal",      13.0358, 77.5970, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 90,  "2026-06-18T08:15:00Z"),
  ev("HSR Layout Sector 2",         13.0180, 77.6500, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 120, "2026-06-18T07:30:00Z"),
  ev("Hebbal Flyover Base",         13.0359, 77.5971, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  200, "2026-06-18T06:00:00Z"),
  ev("Majestic Bus Station",        13.0827, 77.5654, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  300, "2026-06-18T04:30:00Z"),
  ev("Marathahalli Bridge",         12.9591, 77.7009, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 60,  "2026-06-18T09:00:00Z"),
  ev("BTM Layout Water Tank Jn",    12.9164, 77.6100, "WATER_LOGGING", "UNPLANNED", "HIGH",   false, 90,  "2026-06-18T07:45:00Z"),
  ev("Yelahanka Underpass",         13.1005, 77.5963, "WATER_LOGGING", "UNPLANNED", "MEDIUM", true,  110, "2026-06-18T06:15:00Z"),
  ev("Varthur Main Road",           12.9416, 77.7407, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  180, "2026-06-18T05:30:00Z"),
  ev("Whitefield ITPL Gate",        12.9698, 77.7500, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 75,  "2026-06-18T08:00:00Z"),
  ev("Indiranagar 100ft Road",      12.9716, 77.6412, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 45,  "2026-06-18T09:30:00Z"),
  ev("Jayanagar 4th Block",         12.9299, 77.5838, "WATER_LOGGING", "UNPLANNED", "LOW",    false, 30,  "2026-06-18T10:00:00Z"),
  ev("Bannerghatta Road Arekere",   12.8811, 77.5960, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  160, "2026-06-18T06:45:00Z"),

  // ── BLOCKAGE (Accidents, Breakdowns, Tree Falls) ──
  ev("Outer Ring Road Marathahalli", 12.9591, 77.7009, "ACCIDENT",           "UNPLANNED", "HIGH",   true,  120, "2026-06-18T08:30:00Z"),
  ev("MG Road Metro Exit",          12.9756, 77.6077, "ACCIDENT",           "UNPLANNED", "HIGH",   true,  60,  "2026-06-18T09:15:00Z"),
  ev("Hosur Road Madiwala",         12.9215, 77.6194, "VEHICLE_BREAKDOWN",  "UNPLANNED", "MEDIUM", false, 45,  "2026-06-18T10:30:00Z"),
  ev("Mysore Road Kengeri",         12.9120, 77.4960, "TREE_FALL",          "UNPLANNED", "HIGH",   true,  90,  "2026-06-18T05:00:00Z"),
  ev("Old Airport Road HAL",       12.9609, 77.6650, "ACCIDENT",           "UNPLANNED", "HIGH",   true,  75,  "2026-06-18T11:00:00Z"),
  ev("Tumkur Road Yeshwanthpur",    13.0266, 77.5418, "DEBRIS",             "UNPLANNED", "MEDIUM", false, 30,  "2026-06-18T07:00:00Z"),
  ev("Electronic City Phase 1",     12.8456, 77.6603, "CONGESTION",         "UNPLANNED", "HIGH",   false, 180, "2026-06-18T08:00:00Z"),
  ev("Sarjapur Road Wipro Gate",    12.9100, 77.6830, "ACCIDENT",           "UNPLANNED", "MEDIUM", true,  50,  "2026-06-18T12:00:00Z"),
  ev("Bellary Road Palace Grounds", 13.0000, 77.5850, "VEHICLE_BREAKDOWN",  "UNPLANNED", "LOW",    false, 20,  "2026-06-18T13:00:00Z"),
  ev("Hennur Main Road",           13.0400, 77.6350, "TREE_FALL",          "UNPLANNED", "HIGH",   true,  100, "2026-06-18T04:00:00Z"),
  ev("Kasturba Road Central",      12.9788, 77.5996, "CONGESTION",         "UNPLANNED", "MEDIUM", false, 150, "2026-06-18T09:00:00Z"),
  ev("Domlur Flyover",             12.9610, 77.6380, "ACCIDENT",           "UNPLANNED", "HIGH",   true,  40,  "2026-06-18T14:00:00Z"),
  ev("Banerghatta National Park Rd",12.8700, 77.5900, "TREE_FALL",          "UNPLANNED", "MEDIUM", true,  80,  "2026-06-18T03:30:00Z"),
  ev("Kanakapura Road Nice Jn",    12.8600, 77.5500, "VEHICLE_BREAKDOWN",  "UNPLANNED", "LOW",    false, 25,  "2026-06-18T15:00:00Z"),
  ev("Nagawara Outer Ring",        13.0450, 77.6200, "CONGESTION",         "UNPLANNED", "HIGH",   false, 200, "2026-06-18T08:15:00Z"),

  // ── CIVIC_WORK (Construction, Road Conditions, Potholes) ──
  ev("Tin Factory Junction",        12.9936, 77.6751, "CONSTRUCTION",       "PLANNED",   "HIGH",   true,  480, "2026-06-18T22:00:00Z"),
  ev("Namma Metro Phase 2A ORR",    12.9500, 77.6900, "CONSTRUCTION",       "PLANNED",   "HIGH",   true,  720, "2026-06-18T00:00:00Z"),
  ev("Whitefield Railway Crossing", 12.9700, 77.7500, "CONSTRUCTION",       "PLANNED",   "MEDIUM", true,  360, "2026-06-18T21:00:00Z"),
  ev("Hosur Road Flyover Extension",12.9000, 77.6100, "CONSTRUCTION",       "PLANNED",   "HIGH",   true,  600, "2026-06-18T23:00:00Z"),
  ev("Mysore Road Underpass Work",  12.9500, 77.5200, "CONSTRUCTION",       "PLANNED",   "MEDIUM", true,  480, "2026-06-18T20:00:00Z"),
  ev("Richmond Road Resurfacing",   12.9686, 77.6024, "ROAD_CONDITIONS",    "PLANNED",   "LOW",    false, 240, "2026-06-18T01:00:00Z"),
  ev("Infantry Road Pothole Patch", 12.9820, 77.6010, "POT_HOLES",          "UNPLANNED", "LOW",    false, 60,  "2026-06-18T11:00:00Z"),
  ev("CMH Road Storm Drain Work",   12.9690, 77.6150, "CONSTRUCTION",       "PLANNED",   "MEDIUM", false, 300, "2026-06-18T22:30:00Z"),
  ev("Kundanahalli Gate Widening",  12.9600, 77.7100, "CONSTRUCTION",       "PLANNED",   "HIGH",   true,  540, "2026-06-18T23:30:00Z"),
  ev("Koramangala 80ft Road Relaying", 12.9350, 77.6130, "ROAD_CONDITIONS", "PLANNED",   "MEDIUM", true,  180, "2026-06-18T02:00:00Z"),

  // ── RALLY_OR_GATHERING ──
  ev("Freedom Park",                12.9778, 77.5729, "PUBLIC_EVENT",       "PLANNED",   "MEDIUM", true,  180, "2026-06-18T10:00:00Z"),
  ev("Town Hall to Vidhana Soudha", 12.9780, 77.5900, "PROCESSION",        "PLANNED",   "HIGH",   true,  240, "2026-06-18T09:00:00Z"),
  ev("Palace Grounds NICE Road",    13.0050, 77.5700, "PUBLIC_EVENT",       "PLANNED",   "HIGH",   true,  360, "2026-06-18T16:00:00Z"),
  ev("Lalbagh West Gate",           12.9507, 77.5848, "PUBLIC_EVENT",       "PLANNED",   "LOW",    false, 120, "2026-06-18T06:00:00Z"),
  ev("Cubbon Park Entrance",        12.9763, 77.5929, "PROTEST",            "UNPLANNED", "HIGH",   true,  90,  "2026-06-18T11:00:00Z"),
  ev("Malleshwaram 8th Cross",      13.0034, 77.5700, "PROCESSION",        "PLANNED",   "MEDIUM", false, 60,  "2026-06-18T07:30:00Z"),
  ev("JP Nagar 6th Phase",          12.8990, 77.5920, "PUBLIC_EVENT",       "PLANNED",   "LOW",    false, 90,  "2026-06-18T17:00:00Z"),

  // ── VIP ──
  ev("Raj Bhavan Road",             12.9870, 77.5910, "VIP_MOVEMENT",       "PLANNED",   "HIGH",   true,  45,  "2026-06-18T10:30:00Z"),
  ev("Airport Road to Vidhan Soudha",13.0500, 77.5950, "VIP_MOVEMENT",      "PLANNED",   "HIGH",   true,  60,  "2026-06-18T09:30:00Z"),
  ev("HAL Airport Road",            12.9580, 77.6650, "VIP_MOVEMENT",       "PLANNED",   "HIGH",   true,  30,  "2026-06-18T14:00:00Z"),

  // ── Extra density — more monsoon + blockage events to fill out realistic volume ──
  ev("Bellandur Colony Road",       12.9260, 77.6780, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 80,  "2026-06-18T06:30:00Z"),
  ev("Bellandur ORR Service Road",  12.9300, 77.6820, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  200, "2026-06-18T05:00:00Z"),
  ev("Silk Board Flyover Ramp",     12.9190, 77.6240, "CONGESTION",    "UNPLANNED", "HIGH",   false, 300, "2026-06-18T08:00:00Z"),
  ev("Hebbal Ring Road Merge",      13.0380, 77.5980, "CONGESTION",    "UNPLANNED", "HIGH",   false, 240, "2026-06-18T08:30:00Z"),
  ev("Hebbal Lake Overflow Road",   13.0400, 77.5900, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  180, "2026-06-18T04:00:00Z"),
  ev("Majestic BMTC Hub",           13.0810, 77.5640, "CONGESTION",    "UNPLANNED", "HIGH",   false, 360, "2026-06-18T07:00:00Z"),
  ev("Majestic Metro Station Exit", 13.0835, 77.5660, "WATER_LOGGING", "UNPLANNED", "MEDIUM", false, 60,  "2026-06-18T07:30:00Z"),
  ev("KR Puram Tin Factory Link",   12.9950, 77.6760, "ACCIDENT",      "UNPLANNED", "HIGH",   true,  55,  "2026-06-18T10:00:00Z"),
  ev("Electronic City Infosys Gate",12.8400, 77.6580, "CONGESTION",    "UNPLANNED", "HIGH",   false, 240, "2026-06-18T08:45:00Z"),
  ev("Electronic City Flyover Base",12.8480, 77.6620, "WATER_LOGGING", "UNPLANNED", "HIGH",   true,  160, "2026-06-18T05:15:00Z"),
  ev("Sarjapur Attibele Road",      12.8900, 77.6900, "POT_HOLES",     "UNPLANNED", "MEDIUM", false, 999, "2026-06-18T00:00:00Z"),
  ev("Whitefield EPIP Zone",        12.9720, 77.7520, "CONGESTION",    "UNPLANNED", "HIGH",   false, 300, "2026-06-18T08:00:00Z"),
  ev("Yeshwanthpur Circle",         13.0280, 77.5430, "ACCIDENT",      "UNPLANNED", "MEDIUM", true,  40,  "2026-06-18T12:30:00Z"),
  ev("Peenya Industrial Area",      13.0300, 77.5200, "VEHICLE_BREAKDOWN", "UNPLANNED", "LOW", false, 20,  "2026-06-18T14:30:00Z"),
  ev("Banashankari BDA Complex",    12.9250, 77.5600, "PUBLIC_EVENT",  "PLANNED",   "MEDIUM", false, 120, "2026-06-18T16:00:00Z"),
  ev("Vijayanagar BEL Circle",     13.0100, 77.5350, "CONSTRUCTION",  "PLANNED",   "MEDIUM", true,  360, "2026-06-18T22:00:00Z"),
  ev("Rajajinagar Chord Road",     13.0050, 77.5550, "ROAD_CONDITIONS","UNPLANNED", "MEDIUM", false, 999, "2026-06-18T00:00:00Z"),
  ev("Basaveshwaranagar Ring Road", 12.9900, 77.5350, "CONGESTION",    "UNPLANNED", "MEDIUM", false, 180, "2026-06-18T09:00:00Z"),
  ev("Devanahalli Airport Road",    13.1900, 77.6800, "VIP_MOVEMENT",  "PLANNED",   "HIGH",   true,  45,  "2026-06-18T11:00:00Z"),
  ev("Sadashivanagar Palace Road",  13.0000, 77.5820, "VIP_MOVEMENT",  "PLANNED",   "HIGH",   true,  30,  "2026-06-18T15:00:00Z"),
];

/* ════════════════════════════════════════════════════════════
   Phase II: Aggregation Queries (mirrors SQL GROUP BY logic)
   ════════════════════════════════════════════════════════════ */

export interface HotspotResult {
  location_name: string;
  latitude: number;
  longitude: number;
  event_count: number;
  total_severity: number;
}

export interface CivicWorkResult {
  location_name: string;
  latitude: number;
  longitude: number;
  duration_minutes: number;
}

/**
 * GROUP BY location, SUM severity, ORDER BY total_severity DESC, LIMIT n
 */
function aggregateByCategory(
  events: TrafficEvent[],
  category: PravahCategory,
  extraFilter?: (e: TrafficEvent) => boolean,
  limit = 5
): HotspotResult[] {
  const filtered = events
    .filter(e => e.pravah_category === category)
    .filter(e => extraFilter ? extraFilter(e) : true);

  // GROUP BY location_name (using first occurrence's lat/lng)
  const groups = new Map<string, { lat: number; lng: number; count: number; severity: number }>();
  for (const e of filtered) {
    const key = e.location_name;
    const g = groups.get(key);
    if (g) {
      g.count++;
      g.severity += e.severity_index;
    } else {
      groups.set(key, { lat: e.latitude, lng: e.longitude, count: 1, severity: e.severity_index });
    }
  }

  // ORDER BY total_severity DESC, LIMIT
  return Array.from(groups.entries())
    .map(([name, g]) => ({
      location_name: name,
      latitude: g.lat,
      longitude: g.lng,
      event_count: g.count,
      total_severity: g.severity,
    }))
    .sort((a, b) => b.total_severity - a.total_severity)
    .slice(0, limit);
}

/**
 * Civic works: PLANNED + road closure, ORDER BY duration DESC
 */
function aggregateCivicWorks(events: TrafficEvent[], limit = 5): CivicWorkResult[] {
  return events
    .filter(e => e.pravah_category === "CIVIC_WORK" && e.event_type === "PLANNED" && e.requires_road_closure)
    .sort((a, b) => b.duration_minutes - a.duration_minutes)
    .slice(0, limit)
    .map(e => ({
      location_name: e.location_name,
      latitude: e.latitude,
      longitude: e.longitude,
      duration_minutes: e.duration_minutes,
    }));
}

/* ─── The Global Grid State payload builder ─── */
export function buildGlobalGridState() {
  return {
    status: "ACTIVE",
    timestamp: new Date().toISOString(),
    total_events_ingested: TRAFFIC_EVENTS.length,
    baseline_hotspots: {
      monsoon: aggregateByCategory(TRAFFIC_EVENTS, "MONSOON"),
      blockages: aggregateByCategory(TRAFFIC_EVENTS, "BLOCKAGE", e => e.event_type === "UNPLANNED"),
      civic_works: aggregateCivicWorks(TRAFFIC_EVENTS),
      rallies: aggregateByCategory(TRAFFIC_EVENTS, "RALLY_OR_GATHERING"),
      vip: aggregateByCategory(TRAFFIC_EVENTS, "VIP"),
    },
    category_summary: getCategorySummary(),
  };
}

/* ─── Category counts for dashboard sidebar ─── */
function getCategorySummary() {
  const counts: Record<string, number> = {};
  for (const e of TRAFFIC_EVENTS) {
    counts[e.pravah_category] = (counts[e.pravah_category] || 0) + 1;
  }
  return counts;
}

/* ─── Filter by dashboard bucket ─── */
export function getEventsByCategory(category: PravahCategory): TrafficEvent[] {
  return TRAFFIC_EVENTS.filter(e => e.pravah_category === category);
}
