export type ThemeKey =
  | "all"
  | "monsoonHit"
  | "civicWorks"
  | "accident"
  | "breakdown";

export type ThemeConfig = {
  label: string;
  causes: string[] | null;
  color: string;
};

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  all: {
    label: "All events",
    causes: null,
    color: "#6366f1",
  },
  monsoonHit: {
    label: "Monsoon hit",
    causes: ["WATER_LOGGING", "ROAD_CONDITIONS", "POT_HOLES"],
    color: "#0ea5e9",
  },
  civicWorks: {
    label: "Civic works",
    causes: ["CONSTRUCTION", "PUBLIC_EVENT"],
    color: "#22c55e",
  },
  accident: {
    label: "Accidents",
    causes: ["ACCIDENT"],
    color: "#ef4444",
  },
  breakdown: {
    label: "Breakdowns",
    causes: ["VEHICLE_BREAKDOWN"],
    color: "#f97316",
  },
};

export type SceneMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
};

export type Scene = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  theme: ThemeKey;
  metrics: SceneMetric[];
  ring?: boolean;
};

export const SCENES: Scene[] = [
  {
    id: "awareness",
    eyebrow: "Command center",
    title: "Absolute Awareness. Enter the command center.",
    body:
      "At a glance, PRAVAH gives you the entire city's heartbeat, tracking historical choke points and live telemetry.",
    theme: "all",
    metrics: [
      { label: "Live zones", value: "11" },
      { label: "Corridors", value: "12" },
      { label: "Active events", value: "148" },
      { label: "Trend", value: "Stable", tone: "positive" },
    ],
  },
  {
    id: "chaos",
    eyebrow: "Theme switch",
    title: "Target the Chaos.",
    body:
      "Monsoon-hit corridors rise first. Waterlogging, road conditions, and potholes are isolated before the rest of the network saturates.",
    theme: "monsoonHit",
    metrics: [
      { label: "Waterlogging", value: "38", tone: "warning" },
      { label: "Road conditions", value: "72" },
      { label: "Potholes", value: "44" },
      { label: "Affected rings", value: "9", tone: "danger" },
    ],
  },
  {
    id: "deploy",
    eyebrow: "Deployment",
    title: "Deterministic Deployment. No guesswork.",
    body:
      "When civic works or breakdowns appear, the map recenters, highlights the cluster, and keeps every other event dimmed in place.",
    theme: "accident",
    ring: true,
    metrics: [
      { label: "Deploy", value: "3" },
      { label: "1 to Material", value: "29%" },
      { label: "1 to Bypass", value: "6.14" },
      { label: "Recovery", value: "14m", tone: "positive" },
    ],
  },
];

export const FEATURE_CARDS = [
  {
    title: "Sub-Second Response",
    body:
      "Deployment parameters refresh instantly so operators can move from detection to action without losing context.",
  },
  {
    title: "O.N.D.C. Native",
    body:
      "PRAVAH is structured to work with the city's operating flows, from incident intake to service dispatch and routing.",
  },
  {
    title: "Resource Elegance",
    body:
      "Every event keeps its own signal, so you can filter, zoom, and route with less noise and cleaner decisions.",
  },
];

export const BACKEND_STAGES = [
  {
    label: "01",
    title: "Ingest",
    body: "The backend reads the Bengaluru CSV and keeps the event fields needed by the map.",
    signal: "cleaned_astram_events.csv",
  },
  {
    label: "02",
    title: "Normalize",
    body: "Invalid coordinates are dropped, missing values become null, and event IDs stay stable.",
    signal: "latitude + longitude",
  },
  {
    label: "03",
    title: "Serve",
    body: "The pipeline writes public/events.json so any Next.js page can load the same contract.",
    signal: "/events.json",
  },
  {
    label: "04",
    title: "Activate",
    body: "The frontend converts events into GeoJSON, fits bounds, and highlights the selected theme.",
    signal: "Mapbox GeoJSON",
  },
];
