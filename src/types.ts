export interface BottleneckNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  criticality: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  baseFlow: number; // vehicles / hr
  currentFlow: number; // vehicles / hr
  density: number; // vehicles / km
  capacity: number; // vehicles / hr capacity
  laneClosure: string;
  description: string;
  status: "NORMAL" | "CONGESTED" | "DIVERTED" | "SHOCKWAVE";
}

export interface SimulationParameters {
  freeFlowSpeed: number; // km/h
  criticalDensity: number; // vehicles/km where speed drops
  jamDensity: number; // vehicles/km where traffic stops
  selectedBottleneck: BottleneckNode;
  activeSensors: number;
  officersAvailable: number;
  monsoonBonus: boolean;
}

export interface AnalyticalResult {
  waveSpeed: number; // Shockwave speed c = dQ/dK in km/h
  divertedFlowRate: number; // vehicles / hr
  queueLengthDelta: number; // rate of growth or shrink in meters/min
  estimatedRemediationTime: number; // minutes
}

export interface ScrollState {
  id: number;
  title: string;
  subTitle: string;
  text: string;
  targetNodeId: string;
  filterMode: "ALL" | "MONSOON_ONLY" | "ISOLATE_RADISS";
}
