import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  LayoutGrid,
  Layers,
  Home,
  Settings,
  Search,
  ChevronRight,
  MapPin,
  Plus,
  Minus,
  SlidersHorizontal,
  ArrowLeft,
  X,
  Activity,
  ShieldAlert,
  Zap,
  Building2,
  Navigation,
  AlertTriangle,
  Timer,
  Clock,
  Shield,
  Truck,
  Car,
  Lock,
  Hammer,
  Users,
  CloudRain
} from "lucide-react";
import { MapContainer, TileLayer, useMap, useMapEvents, Circle, Tooltip, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ReactMarkdown from "react-markdown";
import type { LatLngBoundsExpression } from "leaflet";

/* ─── Bengaluru bounds (tight crop) ─── */
const BLR_CENTER: [number, number] = [12.97, 77.59];
const BLR_BOUNDS: LatLngBoundsExpression = [
  [12.75, 77.35],
  [13.25, 77.85],
];

/* ─── Dashboard sidebar categories mapped to API ─── */
const DASHBOARD_CATEGORIES = [
  { name: "Chronic Hotspots", key: "chronic" },
  { name: "Live Incidents",   key: "incidents" },
  { name: "Weather Impacts",  key: "weather" },
  { name: "Civic Works",      key: "civic_works" },
  { name: "Events & VIPs",    key: "events_vips" },
  { name: "News Intel",       key: "news" },
  { name: "Signal Failures",  key: "signal_failures" },
];

/* ─── Color map per category ─── */
const CATEGORY_COLORS: Record<string, string> = {
  chronic: "#8e8e8e", // Gray
  incidents: "#e53e3e", // Red
  weather: "#3182ce", // Blue
  civic_works: "#ecc94b", // Yellow
  events_vips: "#805ad5", // Purple
  news: "#06b6d4", // Cyan
  signal_failures: "#dd6b20", // Orange
};

const SIDEBAR_ICONS = [
  { Icon: Home, label: "Home", idx: 0 },
  { Icon: LayoutGrid, label: "Dashboard", idx: 1 },
  { Icon: Layers, label: "Layers", idx: 2 },
  { Icon: User, label: "Profile", idx: 3 },
];

const LOCATION_OPTIONS: { name: string; lat: number; lng: number }[] = [
  { name: "Infantry Road",  lat: 12.9810, lng: 77.5940 }, // BCPS HQ — overview mode
  { name: "Ashok Nagar",    lat: 12.9716, lng: 77.6013 }, // Central division TPS
  { name: "Marathahalli",   lat: 12.9560, lng: 77.7010 }, // East division TPS
  { name: "Jayanagar",      lat: 12.9308, lng: 77.5833 }, // South division TPS
  { name: "Malleshwaram",   lat: 12.9977, lng: 77.5680 }, // North division TPS
];

/* ─── Haversine distance (km) between two lat/lng points ─── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Radius (km) around a TPS centre that defines its jurisdiction */
const TPS_RADIUS_KM = 1.5;

/* ─── Bounds enforcer ─── */
function BoundsEnforcer() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(BLR_BOUNDS);
    const enforceBounds = () => { map.panInsideBounds(BLR_BOUNDS, { animate: false }); };
    map.on("drag", enforceBounds);
    return () => { map.off("drag", enforceBounds); };
  }, [map]);
  return null;
}

/* ─── Fly to selected location OR reset to full city view ─── */
function FlyToLocation({
  lat, lng, isOverview
}: {
  lat: number;
  lng: number;
  isOverview: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (isOverview) {
      // Infantry Road = HQ: show the whole city
      map.flyTo(BLR_CENTER, 12, { duration: 1.4, easeLinearity: 0.25 });
    } else {
      // Convert TPS_RADIUS_KM to lat/lng degree offsets:
      //   1° lat  ≈ 111 km  →  4 km ≈ 0.036°
      //   1° lng at 13°N ≈ 108 km  →  4 km ≈ 0.037°
      const dLat = TPS_RADIUS_KM / 111;
      const dLng = TPS_RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180));
      const bounds: LatLngBoundsExpression = [
        [lat - dLat, lng - dLng], // SW corner
        [lat + dLat, lng + dLng], // NE corner
      ];
      map.flyToBounds(bounds, { padding: [32, 32], duration: 1.4 });
    }
  }, [lat, lng, isOverview, map]);
  return null;
}

/* ─── Zoom to a specific event location when user clicks it in the hover card ─── */
function ZoomToTarget({ target, onDone }: { target: [number, number] | null; onDone: () => void }) {
  const map = useMap();
  const fired = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (target && target !== fired.current) {
      fired.current = target;
      map.flyTo(target, 16, { duration: 1.2, easeLinearity: 0.3 });
      onDone();
    }
  }, [target, map, onDone]);
  return null;
}

/* ─── Zoom controls wired to map ─── */
function MapZoomControls() {
  const map = useMap();
  return (
    <div className="db-zoom">
      <button className="db-zoom-btn" onClick={() => map.zoomIn()} aria-label="Zoom in"><Plus size={17} strokeWidth={2.2} /></button>
      <button className="db-zoom-btn" onClick={() => map.zoomOut()} aria-label="Zoom out"><Minus size={17} strokeWidth={2.2} /></button>
    </div>
  );
}

/* ─── Handle clicks on the map to dismiss panels ─── */
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    }
  });
  return null;
}

/* ─── Types ─── */
interface HotspotItem {
  eventId: string;
  location_name: string;
  latitude: number;
  longitude: number;
  event_count?: number;
  total_severity?: number;
  duration_minutes?: number;
  median_duration_minutes?: number;
  aggregation_cell_meters?: number;
  dashCategory?: string;
  event_cause?: string;
  start_datetime?: string;
  is_severe?: boolean;
}

interface UpcomingEvent {
  eventId: string;
  event_name: string;
  start_datetime: string;
  urgency: 'CURRENT' | 'IMMINENT' | 'UPCOMING';
  is_severe: boolean;
  dashCategory?: string;
  lat?: number;
  lng?: number;
  type?: string;
  street?: string;
  corridor?: string;
}

interface EventCluster {
  clusterId: string;
  latitude: number;
  longitude: number;
  location_name: string;
  peak_urgency: 'CURRENT' | 'IMMINENT' | 'UPCOMING';
  event_count: number;
  events: UpcomingEvent[];
}

interface EventIntelligence {
  eventId: string;
  paradigm: string;
  event_cause: string;
  location: string;
  historical_frequency: string;
  tactical_deployment: {
    officers_required: number;
    barricades_required: number;
    barricade_type?: string;
    rationale: string;
  };
  signal_gating_protocol: {
    status: string;
    upstream_node: string;
    action: string;
    rationale: string;
  };
  lane_blockage_instructions?: {
    lanes_to_close: number;
    total_lanes: number;
    closure_pattern: string;
    taper_length_meters: number;
    rationale: string;
  };
  diversion_protocol?: {
    upstream_diversion_point: string;
    distance_upstream_meters: number;
    alternate_route: string;
    alternate_route_capacity: string;
    rationale: string;
  };
  topological_routing?: {
    primary_choke_point?: string;
    cascade_risk_nodes?: string[];
    recommended_diversion?: string;
    rationale?: string;
  };
  kinematic_state?: {
    baseline_demand_vph: number;
    residual_capacity_vph: number;
    queue_growth_vehicles_per_minute: number;
    shockwave_speed_kmh: number;
    q_ghost_pcu?: number;
    model: string;
  };
  decision_metadata?: {
    mode: string;
    confidence: number;
    model_version: string;
    requires_human_approval: boolean;
    is_volatile?: boolean;
  };
}

interface GridState {
  status: string;
  total_events_ingested: number;
  chronic_hotspots: HotspotItem[];
  category_summary: Record<string, number>;
}

const URGENCY_COLORS: Record<string, string> = {
  CURRENT:  '#EF4444', // red  — happening now
  IMMINENT: '#F59E0B', // amber — within 7 days
  UPCOMING: '#22C55E', // green — further ahead
};

function relativeLabel(dt: string): string {
  const ms  = new Date(dt).getTime() - new Date('2024-03-25T00:00:00Z').getTime();
  const hrs = Math.round(ms / 3_600_000);
  if (hrs < 1)   return 'Now';
  if (hrs < 24)  return `In ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `In ${days}d`;
}

/* ─── Mock Astram Events Database ─── */
export interface AstramEvent {
  id: string;
  eventName: string;
  street: string;
  lat: number;
  lng: number;
  type: "PROACTIVE" | "REACTIVE";
}

const ASTRAM_EVENTS: AstramEvent[] = [
  // Ashok Nagar area (~12.9716, 77.6013)
  { id: "a1", eventName: "accident", street: "2nd church street", lat: 12.9740, lng: 77.6050, type: "REACTIVE" },
  { id: "a2", eventName: "monsoon hit", street: "st marks road", lat: 12.9715, lng: 77.6000, type: "PROACTIVE" },
  { id: "a3", eventName: "water logging", street: "richmond circle", lat: 12.9645, lng: 77.5973, type: "REACTIVE" },
  
  // Other areas
  { id: "a4", eventName: "vehicle breakdown", street: "marathahalli bridge", lat: 12.9560, lng: 77.7010, type: "REACTIVE" },
  { id: "a5", eventName: "vip convoy", street: "jayanagar 4th block", lat: 12.9308, lng: 77.5833, type: "PROACTIVE" },
  { id: "a6", eventName: "road repair", street: "malleshwaram 8th cross", lat: 12.9977, lng: 77.5680, type: "PROACTIVE" },
  { id: "a7", eventName: "cloud burst", street: "koramangala 80ft road", lat: 12.9345, lng: 77.6266, type: "REACTIVE" },
  { id: "a8", eventName: "signal failure", street: "trinity circle", lat: 12.9729, lng: 77.6163, type: "REACTIVE" }
];

/* ─── Custom Leaflet Icon helper for live events ─── */
const getEventIcon = (eventName: string, type: string) => {
  let emoji = "📍";
  const name = eventName.toLowerCase();
  if (name.includes("tree")) emoji = "🌲";
  else if (name.includes("accident") || name.includes("breakdown") || name.includes("crash")) emoji = "🚗";
  else if (name.includes("water") || name.includes("monsoon") || name.includes("burst")) emoji = "💧";
  else if (name.includes("repair") || name.includes("work")) emoji = "🚧";
  else if (name.includes("vip") || name.includes("convoy") || name.includes("police")) emoji = "🚨";
  else if (name.includes("protest") || name.includes("rally") || name.includes("strike")) emoji = "📢";
  else if (name.includes("signal") || name.includes("light")) emoji = "🚦";

  const color = type === "PROACTIVE" ? "#3B82F6" : "#EF4444";

  return L.divIcon({
    html: `<div style="
      font-size: 20px; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.4); 
      background: white;
      border: 2px solid ${color};
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    ">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

/* ─── Middle Panels ─── */
function MiddlePanel({
  activeRailIdx,
  isOverview,
  selectedLocation,
  isDarkMode,
  setIsDarkMode,
  isLocationLocked,
  setIsLocationLocked,
  activeNotifications,
  setActiveRailIdx
}: {
  activeRailIdx: number;
  isOverview: boolean;
  selectedLocation: any;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  isLocationLocked: boolean;
  setIsLocationLocked: (v: boolean) => void;
  activeNotifications: any[];
  setActiveRailIdx: (idx: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Opacity Tuning State
  const [panelOpacity, setPanelOpacity] = useState(0.05);
  const [cardOpacity, setCardOpacity] = useState(0.4);
  const [pingOpacity, setPingOpacity] = useState(0.7);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setActiveRailIdx(0);
      }
    }
    if (activeRailIdx !== 0) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeRailIdx, setActiveRailIdx]);

  if (activeRailIdx === 0) return null;

  return (
    <div className="db-middle-overlay">
      <div 
        className="db-middle-panel" 
        ref={panelRef}
        style={{ background: `rgba(255, 255, 255, ${panelOpacity})` }}
      >
        {/* Opacity slider removed */}
        {activeRailIdx === 1 && (
          <DashboardCards 
            isOverview={isOverview} 
            locationName={selectedLocation.name} 
          />
        )}
        {activeRailIdx === 2 && (
          <LayersPanel 
            activeNotifications={activeNotifications} 
          />
        )}
        {activeRailIdx === 3 && (
          <ProfilePanel />
        )}
        {activeRailIdx === 4 && (
          <SettingsPanel 
            isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
            isLocationLocked={isLocationLocked} setIsLocationLocked={setIsLocationLocked}
          />
        )}
      </div>
    </div>
  );
}

function DashboardCards({ 
  isOverview, 
  locationName
}: { 
  isOverview: boolean, 
  locationName: string
}) {
  const policeForce = isOverview ? { deployed: 450, reserve: 150 } : { deployed: 45, reserve: 12 };
  const logistics = isOverview 
    ? { barricades: 800, cones: 1200, trucks: 45 } 
    : { barricades: 80, cones: 120, trucks: 4 };
  const transport = isOverview 
    ? { interceptors: 85, tow: 20 } 
    : { interceptors: 8, tow: 3 };

  return (
    <div className="db-middle-cards">
      <h2 className="db-middle-title">{isOverview ? "Combined City Force" : `${locationName} Force`}</h2>
      
      <div className="db-interactive-grid">
        
        {/* Police Force Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <Shield size={24} className="db-interactive-icon" />
            <h3 className="db-interactive-title">Police Force</h3>
            <div className="db-interactive-stat">{policeForce.deployed + policeForce.reserve}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item">
                <span className="db-hover-label">Deployed</span>
                <span className="db-hover-val">{policeForce.deployed}</span>
              </div>
              <div className="db-hover-item">
                <span className="db-hover-label">Reserve</span>
                <span className="db-hover-val">{policeForce.reserve}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logistics Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <Truck size={24} className="db-interactive-icon" />
            <h3 className="db-interactive-title">Logistics</h3>
            <div className="db-interactive-stat">{logistics.barricades + logistics.cones + logistics.trucks}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item">
                <span className="db-hover-label">Barricades</span>
                <span className="db-hover-val">{logistics.barricades}</span>
              </div>
              <div className="db-hover-item">
                <span className="db-hover-label">Traffic Cones</span>
                <span className="db-hover-val">{logistics.cones}</span>
              </div>
              <div className="db-hover-item">
                <span className="db-hover-label">Utility Trucks</span>
                <span className="db-hover-val">{logistics.trucks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transportation Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <Car size={24} className="db-interactive-icon" />
            <h3 className="db-interactive-title">Transportation</h3>
            <div className="db-interactive-stat">{transport.interceptors + transport.tow}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item">
                <span className="db-hover-label">Interceptors</span>
                <span className="db-hover-val">{transport.interceptors}</span>
              </div>
              <div className="db-hover-item">
                <span className="db-hover-label">Tow Trucks</span>
                <span className="db-hover-val">{transport.tow}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      <div className="db-deployment-data">
        <h3>Deployment Data</h3>
        <div className="db-deployment-row group">
          <div className="db-deploy-line"></div>
        </div>
      </div>
    </div>
  );
}

function LayersPanel({ 
  activeNotifications 
}: { 
  activeNotifications: any[] 
}) {
  // Mock clean historical data
  const historicalStats = {
    incidents: { total: 142, potholes: 64, breakdowns: 58, waterlogging: 20 },
    civic: { total: 24, bwssb: 12, bescom: 8, bbmp: 4 },
    events: { total: 12, protests: 5, vips: 4, rallies: 3 }
  };

  const cleanRecords = [
    { date: "23 Apr", type: "INCIDENTS", subtype: "Vehicle Breakdown", loc: "Museum Road" },
    { date: "22 Apr", type: "CIVIC WORKS", subtype: "BWSSB Pipe Laying", loc: "G Narayana Kumar Road" },
    { date: "20 Apr", type: "EVENTS_VIPS", subtype: "VIP Movement", loc: "1st Cross Road" },
    { date: "18 Apr", type: "INCIDENTS", subtype: "Pot Holes Fixed", loc: "9th Cross Road" },
    { date: "15 Apr", type: "SIGNAL_FAILURES", subtype: "Signal Restored", loc: "Dr Rajkumar Puniya Bhoomi Road" },
  ];

  return (
    <div className="db-middle-layers">
      <h2 className="db-middle-title">Last 30 Days Record</h2>
      
      {/* Interactive Grid for Historical Summaries */}
      <div className="db-interactive-grid" style={{ marginBottom: 24 }}>
        
        {/* Incidents Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <AlertTriangle size={24} className="db-interactive-icon" style={{ color: '#ef4444' }} />
            <h3 className="db-interactive-title">Total Incidents</h3>
            <div className="db-interactive-stat">{historicalStats.incidents.total}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item"><span className="db-hover-label">Pot Holes</span><span className="db-hover-val">{historicalStats.incidents.potholes}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">Breakdowns</span><span className="db-hover-val">{historicalStats.incidents.breakdowns}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">Waterlogging</span><span className="db-hover-val">{historicalStats.incidents.waterlogging}</span></div>
            </div>
          </div>
        </div>

        {/* Civic Works Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <Hammer size={24} className="db-interactive-icon" style={{ color: '#f59e0b' }} />
            <h3 className="db-interactive-title">Civic Works</h3>
            <div className="db-interactive-stat">{historicalStats.civic.total}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item"><span className="db-hover-label">BWSSB</span><span className="db-hover-val">{historicalStats.civic.bwssb}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">BESCOM</span><span className="db-hover-val">{historicalStats.civic.bescom}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">BBMP</span><span className="db-hover-val">{historicalStats.civic.bbmp}</span></div>
            </div>
          </div>
        </div>

        {/* Events Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-interactive-card">
            <Users size={24} className="db-interactive-icon" style={{ color: '#8b5cf6' }} />
            <h3 className="db-interactive-title">Events & VIPs</h3>
            <div className="db-interactive-stat">{historicalStats.events.total}</div>
            
            <div className="db-interactive-hover">
              <div className="db-hover-item"><span className="db-hover-label">Protests</span><span className="db-hover-val">{historicalStats.events.protests}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">VIP Routes</span><span className="db-hover-val">{historicalStats.events.vips}</span></div>
              <div className="db-hover-item"><span className="db-hover-label">Rallies</span><span className="db-hover-val">{historicalStats.events.rallies}</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* Cleaned Records List */}
      <h3 className="db-pings-title">Astram Pings</h3>
      <div className="db-layers-list">
        {cleanRecords.map((rec, i) => (
          <div key={`${rec.type}-${i}`} className="db-layer-ping" style={{ padding: '12px 16px' }}>
            <div className="db-ping-header" style={{ marginBottom: 4 }}>
              <span className={`db-ping-badge db-ping-${rec.type.replace(' ', '_')}`}>
                {rec.type}
              </span>
              <span className="db-ping-time">{rec.date}</span>
            </div>
            <p className="db-ping-loc" style={{ margin: 0, fontSize: 14 }}>{rec.subtype}</p>
            <p className="db-ping-desc" style={{ fontSize: 12 }}>{rec.loc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePanel() {
  const userId = localStorage.getItem("pravah_auth") || "BTP-9982";
  return (
    <div className="db-middle-profile">
      <h2 className="db-middle-title">Profile</h2>
      <div className="db-profile-info">
        <User size={48} className="db-profile-avatar" />
        <div className="db-profile-details">
          <h3>Traffic Commissioner</h3>
          <p>ID: {userId}</p>
          <p>Last Login: {new Date().toLocaleDateString()} 08:45 AM</p>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ isDarkMode, setIsDarkMode, isLocationLocked, setIsLocationLocked }: any) {
  return (
    <div className="db-middle-settings">
      <h2 className="db-middle-title">Settings</h2>
      <div className="db-setting-row">
        <span>Dark Mode</span>
        <button className={`db-toggle ${isDarkMode ? 'active' : ''}`} onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle dark mode">
          <div className="db-toggle-thumb" />
        </button>
      </div>
      <div className="db-setting-row">
        <span>Lock Location</span>
        <button className={`db-toggle ${isLocationLocked ? 'active' : ''}`} onClick={() => setIsLocationLocked(!isLocationLocked)} aria-label="Toggle location lock">
          <div className="db-toggle-thumb" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const handleZoomDone = React.useCallback(() => setZoomTarget(null), []);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  // Auth State
  const isAuthenticated = !!localStorage.getItem("pravah_auth");

  // Opacity Tuning State for Sidebars
  const [sidebarOpacity, setSidebarOpacity] = useState(0.85);
  const [subSidebarOpacity, setSubSidebarOpacity] = useState(0.85);

  useEffect(() => {
    if (isDarkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [isDarkMode]);

  const [activeFilter, setActiveFilter] = useState<"State" | "Road">("State");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDashboard, setActiveDashboard] = useState("chronic");
  const [activeRailIdx, setActiveRailIdx] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(LOCATION_OPTIONS[0]); // Default to Infantry Road
  const [isLocationHovered, setIsLocationHovered] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredDashboard, setHoveredDashboard] = useState<string | null>(null);
  const dashHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDashEnter = (key: string) => {
    if (dashHoverTimerRef.current) clearTimeout(dashHoverTimerRef.current);
    setHoveredDashboard(key);
  };
  const handleDashLeave = () => {
    dashHoverTimerRef.current = setTimeout(() => setHoveredDashboard(null), 300);
  };

  // Astram Notification State
  const [activeNotifications, setActiveNotifications] = useState<(AstramEvent & { displayId: number, dashCategory?: string })[]>([]);
  const notificationIdCounter = useRef(0);

  const handleLocEnter = () => {
    if (isLocationLocked) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsLocationHovered(true);
  };
  const handleLocLeave = () => {
    hideTimerRef.current = setTimeout(() => setIsLocationHovered(false), 200);
  };

  const [gridState, setGridState] = useState<GridState | null>(null);
  const [layerData, setLayerData] = useState<Record<string, EventCluster[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedIntelligence, setSelectedIntelligence] = useState<EventIntelligence | null>(null);
  const selectedEventIdRef = useRef<string | null>(null);
  const [aiStrategyResult, setAiStrategyResult] = useState<string | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [hoveredCluster, setHoveredCluster] = useState<EventCluster | null>(null);
  const [zoomTarget, setZoomTarget] = useState<[number, number] | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number>(3);
  const [showFeedbackToast, setShowFeedbackToast] = useState<boolean>(false);

  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  const isOverview = selectedLocation.name === "Infantry Road";

  /* ── Clear caches when location changes so data refetches for new TPS area ── */
  useEffect(() => {
    setGridState(null);
    setLayerData({});
    setSelectedIntelligence(null); selectedEventIdRef.current = null;
    setHoveredCluster(null);
    setZoomTarget(null);
  }, [selectedLocation]);

  const [hitlTimeLeft, setHitlTimeLeft] = useState<number | null>(null);
  const [useMinOfficers, setUseMinOfficers] = useState(false);

  /* ── When an intelligence popup opens, simulate a HITL countdown ── */
  useEffect(() => {
    if (selectedIntelligence) {
      setHitlTimeLeft(45);
      setUseMinOfficers(false);
    } else {
      setHitlTimeLeft(null);
    }
  }, [selectedIntelligence]);

  useEffect(() => {
    if (hitlTimeLeft !== null && hitlTimeLeft > 0) {
      const timer = setTimeout(() => setHitlTimeLeft(hitlTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [hitlTimeLeft]);

  /* ── Reset backend simulation on page reload so pings start from zero ── */
  useEffect(() => {
    fetch('/api/v1/simulation/reset', { method: 'POST' }).catch(console.error);
  }, []);

  /* ── Fetch chronic hotspots scoped to selected TPS ── */
  useEffect(() => {
    setLoading(true);
    const params = isOverview
      ? ''
      : `?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&radiusKm=4`;
    fetch(`/api/v1/grid/chronic-hotspots${params}`)
      .then(res => res.json())
      .then(data => { 
        setGridState(data); 
        if (data.category_summary) {
          setLiveCounts({
            weather: 0,
            incidents: 0,
            civic_works: data.category_summary["CIVIC_WORKS"] || 0,
            events_vips: data.category_summary["EVENTS_VIPS"] || 0,
            signal_failures: 0,
          });
        }
        setLoading(false); 
      })
      .catch(err => { console.error('Failed to load grid state:', err); setLoading(false); });
  }, [selectedLocation, isOverview]);

  /* ── Pre-fetch all layer clusters scoped to selected TPS ── */
  useEffect(() => {
    const params = isOverview
      ? ''
      : `?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&radiusKm=4`;
      
    const categories = ['incidents', 'weather', 'civic_works', 'events_vips', 'signal_failures'];
    
    Promise.all(categories.map(cat => 
      fetch(`/api/v1/grid/layer/${cat}${params}`).then(res => res.json())
    )).then(results => {
      setLayerData(prev => {
        const newData = { ...prev };
        categories.forEach((cat, idx) => {
          const clusters = results[idx].clusters || [];
          if (!newData[cat]) {
            newData[cat] = clusters;
          }
          if (cat === 'civic_works' || cat === 'events_vips') {
            const sum = clusters.reduce((acc: number, c: any) => acc + (c.event_count || 1), 0);
            setLiveCounts(prevCounts => ({ ...prevCounts, [cat]: sum }));
          }
        });
        return newData;
      });
    }).catch(err => console.error('Failed to pre-fetch layers:', err));
  }, [selectedLocation, isOverview]);

  /* ── Astram Notification Stream Simulation ── */
  useEffect(() => {
    const stream = new EventSource('/api/v1/events/stream');
    const handleIncident = (message: MessageEvent) => {
      try {
        const event = JSON.parse(message.data).event;
        const isInfantry = selectedLocation.name === "Infantry Road";
        const dist = haversineKm(event.lat, event.lng, selectedLocation.lat, selectedLocation.lng);
        const isWithinRadius = dist <= TPS_RADIUS_KM;

        if (isInfantry || isWithinRadius) {
          const displayId = notificationIdCounter.current++;
          
          const astramEvent = {
            id: event.eventId,
            eventName: event.event_name,
            street: event.street,
            lat: event.lat,
            lng: event.lng,
            type: event.type,
            dashCategory: event.dashCategory,
            displayId
          };

          setActiveNotifications(prev => [...prev, astramEvent as any]);
          
          setLayerData(prev => {
            const currentLayer = prev[event.dashCategory] || [];
            
            const newCluster: EventCluster = {
              clusterId: event.eventId,
              latitude: event.lat,
              longitude: event.lng,
              location_name: event.street,
              peak_urgency: 'CURRENT',
              event_count: 1,
              events: [event]
            };

            return {
              ...prev,
              [event.dashCategory]: [newCluster, ...currentLayer]
            };
          });

          setLiveCounts(prev => ({
            ...prev,
            [event.dashCategory]: (prev[event.dashCategory] || 0) + 1
          }));

          setTimeout(() => {
            setActiveNotifications(prev => prev.filter(n => n.displayId !== displayId || n.id === selectedEventIdRef.current));
          }, 15000);
        }
      } catch (error) {
        console.error('Invalid Astram stream payload:', error);
      }
    };

    stream.addEventListener('astram.incident', handleIncident as EventListener);
    stream.onerror = () => console.warn('Astram stream reconnecting');

    return () => {
      stream.removeEventListener('astram.incident', handleIncident as EventListener);
      stream.close();
    };
  }, [selectedLocation]);

  /* ── Derive what's visible on the map ── */
  const chronicSpots: HotspotItem[] = gridState?.chronic_hotspots || [];
  
  let layerClusters: EventCluster[] = [];
  if (activeRailIdx === 2) {
    layerClusters = Object.values(layerData).flat() as EventCluster[];
  } else {
    layerClusters = activeDashboard === 'chronic' ? [] : (layerData[activeDashboard] || []);
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <>
    <div className="db-page">
      <div className="db-body">

        {/* Icon Rail */}
        <nav className="db-rail">
          {SIDEBAR_ICONS.map(({ Icon, label, idx }) => (
            <button
              key={label}
              className={`db-rail-btn ${activeRailIdx === idx ? "db-rail-active" : ""}`}
              title={label}
              onClick={() => { setActiveRailIdx(idx); if (label === "Home") navigate("/"); }}
            >
              <Icon size={21} strokeWidth={1.7} />
            </button>
          ))}
          <div className="db-rail-grow" />
          <button 
            className={`db-rail-btn ${activeRailIdx === 4 ? "db-rail-active" : ""}`} 
            title="Settings" 
            onClick={() => setActiveRailIdx(4)}
          >
            <Settings size={21} strokeWidth={1.7} />
          </button>
        </nav>

        {/* Sidebar */}
        <aside className="db-sidebar" style={{ background: `rgba(255, 255, 255, ${sidebarOpacity})` }}>
          <div className="db-sidebar-header">
            <button className="db-back-btn" onClick={() => navigate("/")} title="Back to site">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <h2 className="db-brand">PRΛVΛH</h2>
          </div>

          <div className="db-search-wrap">
            <Search size={15} strokeWidth={2} className="db-search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="db-search-input"
            />
          </div>

          <p className="db-section-label">DASHBOARDS</p>
          <div className="db-dash-list">
            {DASHBOARD_CATEGORIES.map((d) => (
              <button
                key={d.key}
                className={`db-dash-item ${activeDashboard === d.key ? "db-dash-item-active" : ""}`}
                onClick={() => {
                  setActiveDashboard(d.key);
                  if (activeDashboard === d.key) {
                    setSelectedIntelligence(null); selectedEventIdRef.current = null;
                    setShowFeedbackToast(false);
                    setFeedbackScore(3);
                  }
                }}
                onMouseEnter={() => handleDashEnter(d.key)}
                onMouseLeave={handleDashLeave}
              >
                <span className="db-dash-item-row">
                  <span
                    className="db-dash-dot"
                    style={{ background: CATEGORY_COLORS[d.key] }}
                  />
                  {d.name}
                </span>
                {d.key !== "chronic" && liveCounts[d.key] != null && liveCounts[d.key] > 0 && (
                  <span className="db-dash-count">
                    {liveCounts[d.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Live status indicator removed as requested */}

          <div className="db-sidebar-foot">
            <div
              className={`db-location-picker ${isLocationLocked ? "db-location-picker-locked" : ""}`}
              onMouseEnter={isLocationLocked ? undefined : handleLocEnter}
              onMouseLeave={isLocationLocked ? undefined : handleLocLeave}
              style={{ pointerEvents: isLocationLocked ? 'none' : 'auto', opacity: isLocationLocked ? 0.7 : 1 }}
            >
              {/* Hover card — floats to the right of the sidebar */}
              {!isLocationLocked && (
                <div className={`db-location-hover-card ${isLocationHovered ? "db-location-hover-card-visible" : ""}`} role="listbox" aria-label="Select map location">
                  <p className="db-location-hover-label">Select Area</p>
                  <ul className="db-location-list">
                    {LOCATION_OPTIONS.map((loc) => (
                      <li key={loc.name}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedLocation.name === loc.name}
                          className={`db-location-option ${selectedLocation.name === loc.name ? "db-location-option-active" : ""}`}
                          onClick={() => {
                            setSelectedLocation(loc);
                            setIsLocationHovered(false);
                          }}
                        >
                          <span className="db-location-option-bullet" />
                          <span>{loc.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* The pill trigger */}
              <button
                type="button"
                className={`db-location-pill ${(isLocationHovered && !isLocationLocked) ? "db-location-pill-active" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={isLocationHovered && !isLocationLocked}
              >
                <MapPin size={17} strokeWidth={2} className="db-loc-pin" />
                <span>{selectedLocation.name}</span>
                {isLocationLocked ? (
                  <Lock size={14} strokeWidth={2} className="db-loc-arrow text-neutral-400" />
                ) : (
                  <ChevronRight size={15} strokeWidth={2} className={`db-loc-arrow ${isLocationHovered ? "db-loc-arrow-open" : ""}`} />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Sub-Locations Panel (Appears for selected category OR active pings) ── */}
        {(activeRailIdx !== 2) && (layerClusters.length > 0 || activeNotifications.length > 0) && (!selectedIntelligence || hoveredDashboard === activeDashboard) && (
          <aside className="db-sub-sidebar animate-fade-right" style={{ background: `rgba(255, 255, 255, ${subSidebarOpacity})` }}>
            {/* Opacity slider removed */}
            
            {/* Live Astram Pings Section */}
            {activeNotifications.length > 0 && (
              <div className="db-sub-sidebar-live-pings mb-4">
                <h3 className="db-sub-sidebar-title" style={{ color: '#0ea5e9' }}>Live Astram Pings</h3>
                <div className="db-sub-sidebar-list">
                  {activeNotifications.map(n => (
                    <button
                      key={n.displayId}
                      className="db-sub-event-btn group relative"
                      style={{ border: '1px solid rgba(14, 165, 233, 0.3)', backgroundColor: 'rgba(14, 165, 233, 0.05)' }}
                      onClick={() => {
                        setZoomTarget([n.lat, n.lng]);
                        setIntelligenceLoading(true);
                        fetch(`/api/v1/event/${n.id}/intelligence`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.status === 'success') setSelectedIntelligence(data); selectedEventIdRef.current = data.eventId;
                            setIntelligenceLoading(false);
                          })
                          .catch(err => {
                            console.error("Failed to load int:", err);
                            setIntelligenceLoading(false);
                          });
                      }}
                    >
                      <span
                        className="db-sub-event-dot"
                        style={{ backgroundColor: "#0ea5e9", boxShadow: "0 0 8px #0ea5e9" }}
                      />
                      <div className="db-sub-event-info pr-6">
                        <span className="db-sub-event-name">{n.street} - {n.eventName}</span>
                        <span className="db-sub-event-time" style={{ color: '#7dd3fc' }}>Just Now</span>
                      </div>
                      <div 
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/30 rounded-full text-slate-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNotifications(prev => prev.filter(p => p.displayId !== n.displayId));
                        }}
                      >
                        <X size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {layerClusters.length > 0 && (
              <>
                <h3 className="db-sub-sidebar-title">
                  {activeRailIdx === 2 ? 'All Layers & Records' : `${DASHBOARD_CATEGORIES.find(c => c.key === activeDashboard)?.name} Clusters`}
                </h3>
            <div className="db-sub-sidebar-list">
              {layerClusters.map((cluster) => (
                <div key={cluster.clusterId} className="db-sub-sidebar-group">
                  <h4 className="db-sub-sidebar-group-title">{cluster.location_name}</h4>
                  {cluster.events.map(ev => (
                    <button
                      key={ev.eventId}
                      className="db-sub-event-btn group relative"
                      onClick={() => {
                        setZoomTarget([cluster.latitude, cluster.longitude]);
                        setIntelligenceLoading(true);
                        fetch(`/api/v1/event/${ev.eventId}/intelligence`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.status === 'success') setSelectedIntelligence(data); selectedEventIdRef.current = data.eventId;
                            setIntelligenceLoading(false);
                          })
                          .catch(err => {
                            console.error("Failed to load int:", err);
                            setIntelligenceLoading(false);
                          });
                      }}
                    >
                      <span
                        className="db-sub-event-dot"
                        style={{ backgroundColor: URGENCY_COLORS[ev.urgency] }}
                      />
                      <div className="db-sub-event-info pr-6">
                        <span className="db-sub-event-name">{ev.event_name}</span>
                        <span className="db-sub-event-time">{relativeLabel(ev.start_datetime)}</span>
                      </div>
                      <div 
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/10 rounded-full text-slate-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayerData(prev => {
                            const newLayerData = { ...prev };
                            Object.keys(newLayerData).forEach(key => {
                              newLayerData[key] = newLayerData[key].map(c => ({
                                ...c,
                                events: c.events.filter(event => event.eventId !== ev.eventId)
                              })).filter(c => c.events.length > 0);
                            });
                            return newLayerData;
                          });
                          if (selectedIntelligence?.eventId === ev.eventId) {
                            setSelectedIntelligence(null); selectedEventIdRef.current = null;
                          }
                        }}
                      >
                        <X size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            </>
            )}
          </aside>
        )}

        {/* Map Area */}
        <main className="db-map-area">
          {/* Filter toggles */}
          <div className="db-filters">
            <button 
              className="db-filter-btn db-filter-active animate-pulse" 
              
              onClick={async () => {
                if (!selectedIntelligence?.eventId) return;
                try {
                  const res = await fetch("/api/strategy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                       eventId: selectedIntelligence?.eventId,
                       density: selectedIntelligence?.kinematic_state?.baseline_demand_vph ? Math.round(selectedIntelligence.kinematic_state.baseline_demand_vph / 20) : 85,
                       velocity: selectedIntelligence?.kinematic_state?.shockwave_speed_kmh ?? 15,
                       officersAvailable: selectedIntelligence?.tactical_deployment?.officers_required ?? 45
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setAiStrategyResult(data.protocol);
                  } else {
                    setAiStrategyResult("Error: " + data.error);
                  }
                } catch(e) {
                  setAiStrategyResult("AI Strategy Generation failed.");
                }
              }}
              disabled={!selectedIntelligence?.eventId}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: !selectedIntelligence?.eventId ? 'var(--bg-card)' : 'var(--accent)', color: !selectedIntelligence?.eventId ? '#666' : 'white', borderColor: 'transparent', boxShadow: !selectedIntelligence?.eventId ? 'none' : '0 0 12px rgba(14, 165, 233, 0.4)', opacity: !selectedIntelligence?.eventId ? 0.5 : 1, cursor: !selectedIntelligence?.eventId ? 'not-allowed' : 'pointer' }}
            >
              <Zap size={14} strokeWidth={2.5} />
              <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>GENERATE AI STRATEGY</span>
            </button>
          </div>

          {loading && (
            <div className="db-loading">
              <div className="db-spinner" />
              <span>Loading PRAVAH Grid…</span>
            </div>
          )}

          {/* Leaflet map — locked to Bengaluru */}
          <MapContainer
            center={BLR_CENTER}
            zoom={12}
            minZoom={11}
            maxZoom={16}
            maxBounds={BLR_BOUNDS}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            attributionControl={false}
            className="db-leaflet-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <BoundsEnforcer />
            <FlyToLocation
              lat={selectedLocation.lat}
              lng={selectedLocation.lng}
              isOverview={isOverview}
            />
            <ZoomToTarget target={zoomTarget} onDone={handleZoomDone} />

            {/* ── Chronic Hotspots (Historical Baseline) ── */}
            {activeDashboard === "chronic" && chronicSpots.map((spot, i) => {
              const isSelected = selectedIntelligence?.eventId === spot.eventId;
              return (
                <Circle
                key={`chronic-${spot.eventId || i}`}
                center={[spot.latitude, spot.longitude]}
                radius={isSelected ? 250 : 150}
                pathOptions={{
                  color: isSelected ? "#fff" : (spot.dashCategory ? CATEGORY_COLORS[spot.dashCategory] : CATEGORY_COLORS["chronic"]),
                  fillColor: spot.dashCategory ? CATEGORY_COLORS[spot.dashCategory] : CATEGORY_COLORS["chronic"],
                  fillOpacity: isSelected ? 0.2 : 0.05,
                  weight: isSelected ? 4 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    setZoomTarget([spot.latitude, spot.longitude]);
                    setIntelligenceLoading(true);
                    fetch(`/api/v1/event/${spot.eventId}/intelligence`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.status === 'success') setSelectedIntelligence(data); selectedEventIdRef.current = data.eventId;
                        setIntelligenceLoading(false);
                      })
                      .catch(err => {
                        console.error("Failed to load int:", err);
                        setIntelligenceLoading(false);
                      });
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.92}>
                  <strong>{spot.location_name}</strong><br />
                  {spot.event_count && <>Historical Events: {spot.event_count}<br /></>}
                  {spot.total_severity && <>Aggregated Severity: {spot.total_severity}<br /></>}
                  {spot.duration_minutes && <>Duration: {spot.duration_minutes}m</>}
                </Tooltip>
              </Circle>
            )})}

            {/* ── Layer Clusters (Upcoming / Future Events) ── */}
            {layerClusters.map((cluster, i) => {
              const isSelectedCluster = selectedIntelligence && cluster.events.some(e => e.eventId === selectedIntelligence.eventId);
              const markerColor = URGENCY_COLORS[cluster.peak_urgency] || CATEGORY_COLORS[activeDashboard];
              
              return (
                <Circle
                  key={`cluster-${cluster.clusterId}`}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={isSelectedCluster ? 250 : 150}
                  pathOptions={{
                    color: isSelectedCluster ? "#fff" : markerColor,
                    fillColor: markerColor,
                    fillOpacity: isSelectedCluster ? 0.2 : 0.05,
                    weight: isSelectedCluster ? 4 : 2,
                  }}
                >
                  <Tooltip direction="right" offset={[10, 0]} opacity={1} interactive={true} className="db-cluster-tooltip">
                    <div className="db-cluster-card">
                      <h4>{cluster.location_name}</h4>
                      <div className="db-cluster-events">
                        {cluster.events.map(ev => (
                          <div 
                            key={ev.eventId} 
                            className="db-cluster-event-item"
                            onClick={() => {
                              setZoomTarget([cluster.latitude, cluster.longitude]);
                              // Also trigger intelligence panel
                              setIntelligenceLoading(true);
                              fetch(`/api/v1/event/${ev.eventId}/intelligence`)
                                .then(res => res.json())
                                .then(data => {
                                  if (data.status === 'success') setSelectedIntelligence(data); selectedEventIdRef.current = data.eventId;
                                  setIntelligenceLoading(false);
                                })
                                .catch(err => {
                                  console.error("Failed to load int:", err);
                                  setIntelligenceLoading(false);
                                });
                            }}
                          >
                            <span 
                              className="db-urgency-dot" 
                              style={{ backgroundColor: URGENCY_COLORS[ev.urgency] }} 
                              title={ev.urgency}
                            />
                            <div className="db-ev-details">
                              <span className="db-ev-name">{ev.event_name}</span>
                              <span className="db-ev-time">{relativeLabel(ev.start_datetime)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Tooltip>
                </Circle>
              );
            })}

            {/* Center Marker for Selected Intelligence */}
            {selectedIntelligence && (() => {
              const targetCoord: [number, number] | null = (chronicSpots.find(s => s.eventId === selectedIntelligence.eventId) || 
                   layerClusters.flatMap(c => c.events.map(e => ({...e, lat: c.latitude, lng: c.longitude})))
                     .find(e => e.eventId === selectedIntelligence.eventId))
                    ? [
                        (chronicSpots.find(s => s.eventId === selectedIntelligence.eventId)?.latitude ||
                        layerClusters.flatMap(c => c.events.map(e => ({...e, lat: c.latitude, lng: c.longitude}))).find(e => e.eventId === selectedIntelligence.eventId)!.lat),
                        (chronicSpots.find(s => s.eventId === selectedIntelligence.eventId)?.longitude ||
                        layerClusters.flatMap(c => c.events.map(e => ({...e, lat: c.latitude, lng: c.longitude}))).find(e => e.eventId === selectedIntelligence.eventId)!.lng)
                      ]
                    : null;

              if (!targetCoord) return null;

              let ghostQueuePolyline = null;
              // Bounded Ghost Queue visualizer
              if (selectedIntelligence.kinematic_state?.q_ghost_pcu > 0) {
                const queueLengthKm = (selectedIntelligence.kinematic_state.q_ghost_pcu * 5) / 1000;
                // Draw a simple line extending slightly west to represent the bounded queue spillback
                const endCoord: [number, number] = [targetCoord[0] - (queueLengthKm / 111), targetCoord[1]];
                ghostQueuePolyline = (
                  <Polyline 
                    positions={[targetCoord, endCoord]}
                    pathOptions={{ color: 'red', weight: 8, opacity: 0.8, dashArray: '10, 10' }}
                  />
                );
              }

              return (
                <>
                  {ghostQueuePolyline}
                  <Marker 
                    position={targetCoord} 
                    icon={getEventIcon(selectedIntelligence.event_cause || "event", selectedIntelligence.paradigm)}
                    zIndexOffset={2000}
                  />
                </>
              );
            })()}

            {/* ── Astram Notification Map Markers ── */}
            {activeNotifications.map(n => (
              <Marker 
                key={`marker-${n.displayId}`} 
                position={[n.lat, n.lng]} 
                icon={getEventIcon(n.eventName, n.type)}
                zIndexOffset={1000}
              />
            ))}

            <MapZoomControls />
            <MapClickHandler onMapClick={() => { /* Removed aggressive panel dismissal */ }} />
          </MapContainer>

          <MiddlePanel 
            activeRailIdx={activeRailIdx}
            isOverview={isOverview}
            selectedLocation={selectedLocation}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            isLocationLocked={isLocationLocked}
            setIsLocationLocked={setIsLocationLocked}
            activeNotifications={activeNotifications}
            setActiveRailIdx={setActiveRailIdx}
          />

          {/* Intelligence Overlays */}
          {intelligenceLoading && (
            <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-neutral-200 flex items-center space-x-3 text-sm font-medium">
              <div className="db-spinner w-4 h-4 border-sky-500" />
              <span>Running Deterministic Simulation...</span>
            </div>
          )}

          {selectedIntelligence && !intelligenceLoading && (() => {
            const isProactive = selectedIntelligence.paradigm === 'PROACTIVE';
            const themeColors = isProactive 
              ? { border: 'border-blue-100', bg: 'bg-[#f0f9ff]', icon: 'text-[#0284c7]', bar: 'from-cyan-400 to-blue-600', text: 'text-blue-900', lightBg: 'bg-white', sectionBg: 'bg-transparent' }
              : { border: 'border-rose-100', bg: 'bg-[#fdf3f3]', icon: 'text-[#e11d48]', bar: 'from-amber-400 to-rose-600', text: 'text-rose-900', lightBg: 'bg-white', sectionBg: 'bg-transparent' };

            return (
              <div className={`absolute top-4 right-4 z-[999] w-[calc(100vw-32px)] md:w-[340px] rounded-[14px] shadow-2xl border overflow-hidden flex flex-col animate-fade-up-1 ${themeColors.bg} ${themeColors.border}`}>
                <div className={`p-4 border-b flex justify-between items-center ${themeColors.border} ${themeColors.sectionBg}`}>
                  <div className="flex items-center space-x-2">
                    <Activity size={16} className={themeColors.icon} />
                    <span className={`text-xs font-bold tracking-wider font-mono uppercase ${themeColors.text}`}>{isProactive ? 'Proactive Alert' : 'Reactive Shockwave'}</span>
                  </div>
                  <button onClick={() => {
                    setSelectedIntelligence(null); selectedEventIdRef.current = null;
                    setShowFeedbackToast(false);
                    setFeedbackScore(3);
                  }} className="text-neutral-500 hover:text-neutral-900 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[70vh]">
                  {/* OSRM Override Badge */}
                  {selectedIntelligence.topological_routing?.is_override && (
                    <div className="mb-4 bg-rose-100 border border-rose-300 rounded-lg p-2.5 flex items-start space-x-2 shadow-sm animate-pulse">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs font-semibold text-rose-800 leading-tight">
                        OSRM Override: {selectedIntelligence.topological_routing.override_rationale.split(';')[0]}
                      </div>
                    </div>
                  )}

                  {/* Preemption Badge (Timeout Simulation) */}
                  {hitlTimeLeft === 0 && (
                    <div className="mb-4 bg-amber-100 border border-amber-300 rounded-lg p-2.5 flex items-start space-x-2 shadow-sm">
                      <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs font-semibold text-amber-800 leading-tight">
                        Timeout: Standard Field Officers Dispatched.
                      </div>
                    </div>
                  )}

                  {/* Location & History */}
                  <div className="mb-4">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">Event Location</span>
                    <div className={`font-semibold text-sm ${themeColors.text} mb-1`}>{selectedIntelligence.location?.replace(/,\s*Bengaluru.*/i, '')}</div>
                    <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-100 rounded px-2 py-1 inline-flex">
                      <Zap size={10} className="text-rose-500" />
                      <span className="text-[10px] font-mono text-rose-700">{selectedIntelligence.historical_frequency}</span>
                    </div>
                  </div>

                  {/* Tactical Deployment */}
                  <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.lightBg}`}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200/50">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Tactical Deployment</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div 
                        className="group relative cursor-pointer bg-white/50 rounded p-2 text-center border border-neutral-200/50 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                        onClick={() => setUseMinOfficers(!useMinOfficers)}
                      >
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Officers Required</span>
                        <span className={`block text-lg font-bold ${useMinOfficers ? 'text-rose-600' : themeColors.text}`}>
                          {useMinOfficers ? Math.max(2, (selectedIntelligence.tactical_deployment?.officers_required || 2) - 2) : selectedIntelligence.tactical_deployment?.officers_required}
                        </span>
                        
                        {/* Hover Shortage Card */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-rose-200 shadow-md text-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center space-x-1 pointer-events-none whitespace-nowrap z-50">
                          <AlertTriangle size={12} strokeWidth={2.5} />
                          <span>{useMinOfficers ? "RESTORE OPTIMAL" : "SHORTAGE"}</span>
                        </div>
                      </div>
                      <div className="bg-white/50 rounded p-2 text-center border border-neutral-200/50">
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Barricades</span>
                        <span className={`block text-xs font-bold leading-tight mt-1 ${themeColors.text}`}>
                          {selectedIntelligence.tactical_deployment?.barricades_required || 0}x {selectedIntelligence.tactical_deployment?.barricade_type}
                        </span>
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${themeColors.text}`}>
                      <span className="font-semibold text-[10px] uppercase mr-1">Suggestion:</span>
                      {selectedIntelligence.tactical_deployment?.rationale || `Deploy ${selectedIntelligence.tactical_deployment?.officers_required} officers.`}
                    </p>
                  </div>

                  {/* Signal Gating Protocol */}
                  <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.sectionBg}`}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200/50">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Signal Protocol</span>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded tracking-widest max-w-[120px] truncate" title={selectedIntelligence.signal_gating_protocol?.status}>
                        {selectedIntelligence.signal_gating_protocol?.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-[9px] font-mono text-neutral-500 uppercase">Upstream Node</span>
                      <span className={`font-semibold text-xs ${themeColors.text}`}>{selectedIntelligence.signal_gating_protocol?.upstream_node}</span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-[9px] font-mono text-neutral-500 uppercase">Action</span>
                      <span className="font-mono text-xs font-bold text-rose-600 bg-rose-100/50 px-1 py-0.5 rounded inline-block">
                        {selectedIntelligence.signal_gating_protocol?.action?.split(';')[0]}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${themeColors.text}`}>
                      <span className="font-semibold text-[10px] uppercase mr-1">Suggestion:</span>
                      {selectedIntelligence.signal_gating_protocol?.rationale} Notify {selectedIntelligence.location?.split(',')[0] || 'local'} TPS 6 min prior.
                    </p>
                  </div>

                  {/* Lane Blockage Protocol */}
                  <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.lightBg}`}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200/50">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Lane Blockage Protocol</span>
                    </div>
                    <div className="mb-2 flex justify-between">
                      <div>
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Closure Pattern</span>
                        <span className={`font-semibold text-xs ${themeColors.text}`}>
                          {selectedIntelligence.lane_blockage_instructions?.closure_pattern} ({selectedIntelligence.lane_blockage_instructions?.lanes_to_close}/{selectedIntelligence.lane_blockage_instructions?.total_lanes} Lanes)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Taper Length</span>
                        <span className={`font-semibold text-xs ${themeColors.text}`}>{selectedIntelligence.lane_blockage_instructions?.taper_length_meters}m</span>
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${themeColors.text}`}>
                      <span className="font-semibold text-[10px] uppercase mr-1">Suggestion:</span>
                      {selectedIntelligence.lane_blockage_instructions?.rationale || `Close ${selectedIntelligence.lane_blockage_instructions?.lanes_to_close} lanes.`}
                    </p>
                  </div>

                  {/* 500m Upstream Diversion Protocol */}
                  <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.sectionBg}`}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200/50">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Diversion Protocol</span>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded tracking-widest">
                        {selectedIntelligence.diversion_protocol?.distance_upstream_meters}m UPSTREAM
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-[9px] font-mono text-neutral-500 uppercase">Diversion Point</span>
                      <span className={`font-semibold text-xs ${themeColors.text}`}>{selectedIntelligence.diversion_protocol?.upstream_diversion_point}</span>
                    </div>
                    <div className="mb-2 flex justify-between">
                      <div>
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Alt Route</span>
                        <span className={`font-semibold text-xs ${themeColors.text}`}>{selectedIntelligence.diversion_protocol?.alternate_route}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-mono text-neutral-500 uppercase">Alt Route Cap</span>
                        <span className={`font-semibold text-xs ${themeColors.text}`}>{selectedIntelligence.diversion_protocol?.alternate_route_capacity}</span>
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${themeColors.text}`}>
                      <span className="font-semibold text-[10px] uppercase mr-1">Suggestion:</span>
                      {selectedIntelligence.diversion_protocol?.rationale || `Divert traffic ${selectedIntelligence.diversion_protocol?.distance_upstream_meters}m upstream.`}
                    </p>
                  </div>

                  {/* Weather Analytics Block */}
                  {/waterlogging|weather|rain|storm/i.test(selectedIntelligence.event_cause) && (
                    <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.lightBg} bg-gradient-to-br from-blue-50/50 to-transparent`}>
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-200/50">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 flex items-center space-x-1">
                          <CloudRain size={12} />
                          <span>Weather API Analytics</span>
                        </span>
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded tracking-widest">
                          LIVE
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Precip</span>
                          <span className={`font-semibold text-xs text-blue-600`}>42 mm/hr</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Visibility</span>
                          <span className={`font-semibold text-xs text-amber-600`}>&lt; 50m</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Trend</span>
                          <span className={`font-semibold text-xs text-rose-600`}>Worsening</span>
                        </div>
                      </div>

                      <div className={`border-t border-blue-100/50 pt-2 mb-2`}>
                        <p className={`text-[11px] leading-relaxed ${themeColors.text}`}>
                          <span className="font-semibold text-[10px] uppercase text-rose-600 mr-1">Alert:</span>
                          We think today there are high chances of traffic gridlock due to severe weather.
                        </p>
                        <p className={`text-[11px] leading-relaxed mt-1 text-blue-700 bg-blue-50 p-1.5 rounded`}>
                          <span className="font-semibold">Historical Correlation: </span>
                          Checking historical data, this region gets heavily affected by weather patterns at this exact time from the last 6 continuous years.
                        </p>
                      </div>

                      <div className="bg-rose-50/50 rounded p-2 border border-rose-100">
                        <span className="block text-[10px] font-bold uppercase text-rose-600 mb-1">Action Required</span>
                        <span className={`text-[11px] ${themeColors.text}`}>Deployment more resources (QRTs & Pumps) immediately to critical junctions.</span>
                      </div>
                    </div>
                  )}

                  {selectedIntelligence.kinematic_state && (
                    <div className={`border rounded-lg p-3 shadow-sm mb-4 ${themeColors.border} ${themeColors.lightBg}`}>
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200/50">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Kinematic State</span>
                        <span className={`text-[9px] font-bold ${selectedIntelligence.decision_metadata?.is_volatile ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} px-1.5 py-0.5 rounded tracking-widest`}>
                          {Math.round((selectedIntelligence.decision_metadata?.confidence || 0) * 100)}% CONFIDENCE
                        </span>
                      </div>

                      {/* HVV Volatility Warning */}
                      {selectedIntelligence.decision_metadata?.is_volatile && (
                        <div className="mb-3 bg-rose-50 border border-rose-200 p-2 rounded text-[10px] text-rose-800 font-medium flex items-start space-x-1.5 animate-fade-in shadow-sm">
                          <AlertTriangle size={12} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>⚠️ Volatility Warning: Historic Clearance Unpredictable for this Severity.</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white/50 rounded p-2 border border-neutral-200/50">
                          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Demand / Capacity</span>
                          <span className={`text-xs font-bold ${themeColors.text}`}>{selectedIntelligence.kinematic_state.baseline_demand_vph} / {selectedIntelligence.kinematic_state.residual_capacity_vph} VPH</span>
                        </div>
                        <div className="bg-white/50 rounded p-2 border border-neutral-200/50">
                          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Queue Growth</span>
                          <span className={`text-xs font-bold ${themeColors.text}`}>{selectedIntelligence.kinematic_state.queue_growth_vehicles_per_minute} veh/min</span>
                        </div>
                      </div>
                      <div className="mt-2 text-[9px] font-mono text-neutral-500">Simulation mode · Human approval required · {selectedIntelligence.decision_metadata?.model_version}</div>
                    </div>
                  )}

                  {/* Post-action validation & HITL Release Lock */}
                  <div className="mt-4 pt-3 border-t border-neutral-200/60">
                    
                    {showFeedbackToast ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center flex items-center justify-center space-x-2 animate-fade-in shadow-sm">
                        <Zap size={16} className="text-emerald-600" />
                        <span className="text-[11px] text-emerald-800 font-bold leading-tight">⚡ AI Learning Complete.<br/>Future deployments adjusted! Closing...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">Human-In-The-Loop Lock</span>
                          {hitlTimeLeft !== null && hitlTimeLeft > 0 && (
                            <span className={`text-[11px] font-mono font-bold flex items-center space-x-1 ${hitlTimeLeft < 30 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>
                              <Timer size={12} />
                              <span>{Math.floor(hitlTimeLeft / 60)}:{(hitlTimeLeft % 60).toString().padStart(2, '0')}</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="mb-3 p-2 bg-neutral-100/50 rounded border border-neutral-200/50">
                          <label className="block text-[10px] font-bold text-neutral-600 mb-2 flex justify-between">
                            <span>Easiness of managing traffic</span>
                            <span className="text-rose-600 font-mono">{feedbackScore} / 5</span>
                          </label>
                          <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            step="1"
                            value={feedbackScore}
                            onChange={(e) => setFeedbackScore(Number(e.target.value))}
                            className="w-full h-1.5 bg-neutral-300 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-neutral-400 mt-1 font-mono">
                            <span>1 (Hard)</span>
                            <span>5 (Very Easy)</span>
                          </div>
                        </div>

                        <button 
                          disabled={hitlTimeLeft === 0}
                          onClick={async () => {
                            const response = await fetch(`/api/v1/event/${selectedIntelligence.eventId}/feedback`, {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ score: feedbackScore })
                            });
                            if (response.ok) {
                              setShowFeedbackToast(true);
                              setTimeout(() => {
                                // Filter event from local state to close it
                                setActiveNotifications(prev => prev.filter(p => p.id !== selectedIntelligence.eventId));
                                setLayerData(prev => {
                                  const newLayerData = { ...prev };
                                  Object.keys(newLayerData).forEach(key => {
                                    newLayerData[key] = newLayerData[key].map(c => ({
                                      ...c,
                                      events: c.events.filter(event => event.eventId !== selectedIntelligence.eventId)
                                    })).filter(c => c.events.length > 0);
                                  });
                                  return newLayerData;
                                });
                                setSelectedIntelligence(null); selectedEventIdRef.current = null;
                              }, 1500);
                            }
                          }}
                          className={`w-full py-2.5 text-white text-[12px] font-bold uppercase tracking-widest rounded transition-colors shadow-md flex items-center justify-center space-x-2 ${hitlTimeLeft === 0 ? 'bg-neutral-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                          {hitlTimeLeft === 0 ? 'Lock Expired' : 'Submit Feedback & Close'}
                        </button>
                        
                        {hitlTimeLeft === 0 && (
                          <div className="text-[10px] text-center text-neutral-500 font-mono">
                            Auto-release triggered. Resources returned to pool.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <span className="db-map-attr">© OpenStreetMap</span>
        </main>
      </div>
    </div>
  
    </>
  );
}