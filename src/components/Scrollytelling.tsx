import React, { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  CircleUserRound,
  Gauge,
  Grid2X2,
  Home,
  Layers,
  MapPin,
  Search,
  Settings,
} from "lucide-react";
import { MapContainer, TileLayer, Circle, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ScrollytellingProps {
  theme?: "light" | "dark";
}

const steps = [
  {
    id: 1,
    eyebrow: "01 / MACRO VISUALIZATION",
    title: "Spotting the gridlock.",
    subtitle: "Identify frequent traffic hotspots instantly.",
    body: "PRAVAH aggregates real-time kinematic incident data across the city, giving command teams an immediate, macro-level view of where congestion is hardening.",
  },
  {
    id: 2,
    eyebrow: "02 / ISOLATING THE CHAOS",
    title: "Pinpointing events.",
    subtitle: "Dynamic event tracking and highlights.",
    body: "By diving into specific areas, the map dynamically highlights exact incident locations. Our UI filters out the noise to focus purely on active, critical bottlenecks.",
  },
  {
    id: 3,
    eyebrow: "03 / TACTICAL UI",
    title: "Actionable intelligence.",
    subtitle: "Generate immediate routing strategies.",
    body: "The tactical dashboard generates a simulated, actionable deployment plan. It provides immediate routing suggestions and simulated officer allocation to untangle the gridlock.",
  },
];

export const Scrollytelling: React.FC<ScrollytellingProps> = ({ theme = "light" }) => {
  const [activeStep, setActiveStep] = useState(1);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const isDark = theme === "dark";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const step = Number((entry.target as HTMLElement).dataset.step);
            setActiveStep(step);
          }
        });
      },
      {
        root: null,
        rootMargin: "-25% 0px -25% 0px",
        threshold: 0.1,
      },
    );

    stepRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr] gap-12 lg:gap-16 items-start">
        <div className="space-y-[45vh] lg:space-y-[55vh] py-24 pb-[30vh]">
          {steps.map((step, index) => (
            <div
              key={step.id}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
              data-step={step.id}
              className={`min-h-[40vh] flex flex-col justify-center transition-all duration-1000 ease-out ${
                activeStep === step.id ? "opacity-100 translate-y-0" : "opacity-20 translate-y-8"
              }`}
            >
              <p className="text-[11px] font-mono tracking-[0.22em] uppercase text-sky-600 mb-5">
                {step.eyebrow}
              </p>
              <h3 className={`text-4xl lg:text-4xl font-serif font-semibold tracking-tight leading-[1.02] whitespace-nowrap ${
                isDark ? "text-slate-100" : "text-neutral-950"
              }`}>
                {step.title}
              </h3>
              <h4 className={`mt-3 text-xl lg:text-2xl font-serif leading-tight ${
                isDark ? "text-sky-200" : "text-neutral-800"
              }`}>
                {step.subtitle}
              </h4>
              <p className={`mt-6 max-w-xl text-base leading-relaxed ${
                isDark ? "text-slate-400" : "text-neutral-500"
              }`}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-24">
          <PremiumDashboard activeStep={activeStep} isDark={isDark} />
        </div>
      </div>
    </div>
  );
};

/* ── Dashboard categories matching real backend ── */
const PREVIEW_CATEGORIES = [
  { name: "Chronic Hotspots", color: "#8e8e8e", count: null },
  { name: "Live Incidents",   color: "#e53e3e", count: null },
  { name: "Weather Impacts",  color: "#3182ce", count: null },
  { name: "Civic Works",      color: "#ecc94b", count: 37 },
  { name: "Events & VIPs",    color: "#805ad5", count: 23 },
  { name: "Signal Failures",  color: "#dd6b20", count: null },
];

/* ── Cluster data for the sub-sidebar ── */
const PREVIEW_CLUSTERS = [
  {
    area: "QUEENS ROAD",
    events: [
      { name: "Road Conditions", time: "Now" },
      { name: "Road Conditions", time: "Now" },
      { name: "Road Conditions", time: "Now" },
      { name: "Road Conditions", time: "Now" },
    ],
  },
  {
    area: "BANGALORE RACE COURSE",
    events: [
      { name: "Construction", time: "Now" },
      { name: "Construction", time: "Now" },
      { name: "Road Conditions", time: "Now" },
      { name: "Construction", time: "Now" },
    ],
  },
  { area: "BGS FLYOVER", events: [] },
];

/* ── Map marker positions for scatter dots ── */
const MAP_MARKERS = [
  { x: 185, y: 108, color: "#805ad5" }, // purple — Events
  { x: 625, y: 68,  color: "#e53e3e" }, // red — Incidents
  { x: 598, y: 148, color: "#3182ce" }, // blue — Weather
  { x: 505, y: 238, color: "#e53e3e" }, // red
  { x: 545, y: 195, color: "#ecc94b" }, // yellow — Civic
  { x: 635, y: 180, color: "#8e8e8e" }, // gray — Chronic
  { x: 480, y: 310, color: "#3182ce" }, // blue
  { x: 310, y: 345, color: "#805ad5" }, // purple
  { x: 615, y: 358, color: "#3182ce" }, // blue
  { x: 530, y: 420, color: "#805ad5" }, // purple
  { x: 570, y: 440, color: "#dd6b20" }, // orange — Signal
];

const PremiumDashboard: React.FC<{ activeStep: number; isDark: boolean }> = ({ activeStep, isDark }) => {
  const [userClosedPanel, setUserClosedPanel] = useState(false);
  const clustersOpen = activeStep === 2 && !userClosedPanel;
  const deployOpen = activeStep === 3 && !userClosedPanel;

  // Determine which category is "active" per step
  const activeCatIdx = activeStep === 1 ? 0 : 3; // Chronic → Civic Works (for both step 2 and 3)

  useEffect(() => {
    if (activeStep < 2) setUserClosedPanel(false);
  }, [activeStep]);

  return (
    <div className={`pravah-demo-shell ${isDark ? "pravah-demo-dark" : ""}`}>
      <div className="pravah-demo-body">
        {/* ── Icon Rail ── */}
        <nav className="pd-rail">
          <button className="pd-rail-btn" title="Home"><Home className="w-5 h-5" /></button>
          <button className="pd-rail-btn pd-rail-active" title="Dashboard"><Grid2X2 className="w-5 h-5" /></button>
          <button className="pd-rail-btn" title="Layers"><Layers className="w-5 h-5" /></button>
          <button className="pd-rail-btn" title="Profile"><CircleUserRound className="w-5 h-5" /></button>
          <div className="pd-rail-grow" />
          <button className="pd-rail-btn" title="Settings"><Settings className="w-5 h-5" /></button>
        </nav>

        {/* ── Sidebar ── */}
        <aside className="pd-sidebar">
          <div className="pd-sidebar-header">
            <span className="pd-back-arrow">←</span>
            <span className="pd-brand">P R Λ V Λ H</span>
          </div>

          <div className="pd-search">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span>Search</span>
          </div>

          <p className="pd-section-label">DASHBOARDS</p>
          <div className="pd-dash-list">
            {PREVIEW_CATEGORIES.map((cat, i) => (
              <div
                key={cat.name}
                className={`pd-dash-item ${i === activeCatIdx ? "pd-dash-item-active" : ""}`}
              >
                <span className="pd-dash-row">
                  <span className="pd-dash-dot" style={{ background: cat.color }} />
                  {cat.name}
                </span>
                {cat.count != null && (
                  <span className="pd-dash-count">{cat.count}</span>
                )}
              </div>
            ))}
          </div>

          <div className="pd-sidebar-foot">
            <div className="pd-location-pill">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>Malleshwaram</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </aside>

        {/* ── Sub-sidebar: Clusters (step 2 & 3) ── */}
        <aside className={`pd-sub-sidebar ${clustersOpen ? "pd-sub-sidebar-open" : ""}`}>
          <h3 className="pd-sub-title">Civic Works Clusters</h3>
          <div className="pd-sub-list">
            {PREVIEW_CLUSTERS.map((cluster) => (
              <div key={cluster.area} className="pd-sub-group">
                <h4 className="pd-sub-area">{cluster.area}</h4>
                {cluster.events.map((ev, j) => (
                  <div key={`${cluster.area}-${j}`} className="pd-sub-event">
                    <span className={`pd-sub-event-dot ${ev.name === "Road Conditions" ? "" : "opacity-0"}`} />
                    <div className="pd-sub-event-info">
                      <span className="pd-sub-event-name">{ev.name}</span>
                      <span className="pd-sub-event-time">{ev.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Map Stage ── */}
        <main className="pd-map-stage">
          <BengaluruMap activeStep={activeStep} />
          <div className="pd-map-zoom">
            <button>+</button>
            <button>−</button>
          </div>
          <span className="pd-map-attr">© OpenStreetMap</span>
        </main>

        {/* ── Intelligence Panel (step 3) ── */}
        <aside className={`pd-intel-panel ${deployOpen ? "pd-intel-open" : ""}`}>
          <div className="pd-intel-header">
            <div className="pd-intel-header-left">
              <Gauge className="w-4 h-4 text-rose-600" />
              <span className="pd-intel-badge">REACTIVE SHOCKWAVE</span>
            </div>
            <button
              onClick={() => setUserClosedPanel(true)}
              className="pd-intel-close"
              title="Close"
            >×</button>
          </div>

          <div className="pd-intel-body">
            {/* Location */}
            <div className="pd-intel-section">
              <span className="pd-intel-label">EVENT LOCATION</span>
              <p className="pd-intel-location">Vidhan Vidhi Road, SG Balekundry Circle, Shivaji Nagar</p>
              <div className="pd-intel-freq">
                <Gauge className="w-3 h-3" />
                <span>5 verified matching events within 0.5 km</span>
              </div>
            </div>

            {/* Tactical Deployment */}
            <div className="pd-intel-card">
              <span className="pd-intel-card-title">TACTICAL DEPLOYMENT</span>
              <div className="pd-intel-grid">
                <div className="pd-intel-stat">
                  <span className="pd-intel-stat-label">OFFICERS REQUIRED</span>
                  <strong>4</strong>
                </div>
                <div className="pd-intel-stat">
                  <span className="pd-intel-stat-label">BARRICADES</span>
                  <strong className="pd-intel-stat-text">6x Interlocking Perimeter</strong>
                </div>
              </div>
              <p className="pd-intel-suggestion">
                <b>SUGGESTION:</b> Required to establish 20m taper. Includes zonal and rubbernecking adjustments.
              </p>
            </div>

            {/* Signal Protocol */}
            <div className="pd-intel-card">
              <div className="pd-intel-card-header">
                <span className="pd-intel-card-title">SIGNAL PROTOCOL</span>
                <span className="pd-intel-recommended">RECOMMENDED F...</span>
              </div>
              <div className="pd-intel-node">
                <span className="pd-intel-label">UPSTREAM NODE</span>
                <p className="pd-intel-node-text">Vidhan Vidhi Road upstream decision node</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const pinIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="width: 28px; height: 28px; background: white; border: 3px solid #e53e3e; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: -2px 2px 4px rgba(0,0,0,0.3); margin-top: -14px;"><div style="width: 8px; height: 8px; background: #e53e3e; border-radius: 50%; transform: rotate(45deg);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

const REAL_MAP_MARKERS = [
  { lat: 13.011, lng: 77.568, color: "#805ad5" },
  { lat: 13.008, lng: 77.574, color: "#e53e3e" },
  { lat: 13.002, lng: 77.565, color: "#3182ce" },
  { lat: 12.996, lng: 77.571, color: "#d69e2e" },
  { lat: 12.998, lng: 77.577, color: "#e53e3e" },
  { lat: 13.004, lng: 77.579, color: "#805ad5" },
];

const CORRIDOR_POINTS: [number, number][] = [
  [13.010, 77.5705],
  [13.008, 77.5706],
  [13.005, 77.5706],
  [13.002, 77.5707],
  [12.998, 77.5708],
  [12.995, 77.5709],
];

const CORRIDOR_DOTS = [
  [13.008, 77.5706],
  [13.005, 77.5706],
  [12.998, 77.5708],
];

const AREA_MARKERS = [
  { lat: 13.001, lng: 77.574, color: "#e53e3e" },
  { lat: 13.004, lng: 77.568, color: "#e53e3e" },
];
const PIN_LOCATION: [number, number] = [13.002, 77.5707];

const MapUpdater: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const map = useMap();
  const lastStep = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (lastStep.current === activeStep) return; // Prevent shivering
    lastStep.current = activeStep;

    if (activeStep === 3) {
      // Pan slightly to the right to accommodate the sidebar
      map.flyTo([13.002, 77.5730], 15, { duration: 1.5, easeLinearity: 0.25 });
    } else if (activeStep === 2) {
      // Center on the incident
      map.flyTo([13.002, 77.5707], 15, { duration: 1.5, easeLinearity: 0.25 });
    } else {
      // Back to macro view
      map.flyTo([13.002, 77.5707], 14, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [activeStep, map]);
  return null;
};

const BengaluruMap: React.FC<{ activeStep: number }> = ({ activeStep }) => (
  <div className="relative w-full h-full overflow-hidden bg-[#e8eceb]">
    <div className="absolute inset-0 w-full h-full">
      <div className="absolute inset-0">
        <MapContainer
          center={[13.002, 77.5707]}
          zoom={14}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          className="w-full h-full"
          style={{ filter: 'contrast(1.05) saturate(1.1)' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater activeStep={activeStep} />

          {activeStep < 3 && REAL_MAP_MARKERS.map((m, i) => (
            <React.Fragment key={`rmm-${i}`}>
              <Circle center={[m.lat, m.lng]} radius={60} pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.2 }} />
              <Circle center={[m.lat, m.lng]} radius={15} pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.8, stroke: false }} />
            </React.Fragment>
          ))}

          {activeStep === 3 && (
            <>
              {/* Highlight Circle */}
              <Circle center={PIN_LOCATION} radius={250} pathOptions={{ color: "#fff", fillColor: "#e53e3e", fillOpacity: 0.2, weight: 2 }} />
              <Polyline positions={CORRIDOR_POINTS} pathOptions={{ color: "#e53e3e", weight: 5, dashArray: "10,8", opacity: 0.85 }} />
              
              {CORRIDOR_DOTS.map((pos, i) => (
                <Circle key={`cdot-${i}`} center={pos as [number, number]} radius={15} pathOptions={{ color: "#e53e3e", fillColor: "#e53e3e", fillOpacity: 0.9, stroke: false }} />
              ))}

              {AREA_MARKERS.map((m, i) => (
                <Circle key={`am-${i}`} center={[m.lat, m.lng]} radius={40} pathOptions={{ color: m.color, fill: false, weight: 2, opacity: 0.6 }} />
              ))}

              {/* Central Map Pin */}
              <Marker position={PIN_LOCATION} icon={pinIcon} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  </div>
);
