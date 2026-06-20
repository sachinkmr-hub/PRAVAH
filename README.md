<div align="center">
  <img src="public/logo.png" alt="PRAVAH Logo" width="120" height="120" />
  <h1>P R A V A H</h1>
  <p><strong>Proactive Response And Vehicular Analytics Hub</strong></p>
  <p><em>From Reactive Chaos to Proactive Intelligence: The Next-Gen Traffic Copilot</em></p>
  <p><strong>Built by Team VISION — NSUT Delhi</strong></p>
</div>

<br />

![PRAVAH Map Preview](./map-preview.png)

## The Story So Far

Every day, the Bengaluru Traffic Police Command Center faces a relentless storm of data. An overturned truck on Outer Ring Road, a sudden monsoon deluge in Koramangala, an unannounced VIP convoy sweeping through MG Road. 

Historically, traffic management has been **reactive**. Authorities rely on citizens or ground officers to report an incident, and by the time an intervention strategy is formulated, the shockwave of congestion has already rippled across the city, paralyzing neighboring corridors.

We asked ourselves: *What if the city could anticipate the gridlock before it forms?*

**PRAVAH** was born from this vision. We have engineered a platform that doesn't just display traffic—it thinks ahead. It aggregates disparate intelligence streams, mathematically simulates the kinematic friction of the road, and instantly synthesizes tactical deployment strategies using advanced Generative AI. It empowers officers to squash traffic anomalies at their inception.

## Multi-Source Intelligence Architecture

PRAVAH escapes the limitations of a single data pipeline by harmonizing a triad of critical intelligence networks. This ensures total domain awareness:

1. **ASTRAM Notifications (Unplanned Events)**: Live telemetry capturing spontaneous incidents such as vehicle breakdowns, accidents, and sudden signal failures.
2. **News Agent Pings (Planned Events)**: We scrape and synthesize early-warning data from civic announcements and social feeds to predict disruptions from protests, civic works, and VIP movements *before* they are officially logged.
3. **Weather API & Historical Meteorological Data**: By combining live atmospheric readings with years of monsoon vulnerability maps, we proactively flag chronic hotspots seconds before the first drop of rain hits the asphalt.

### The Dashboard Experience
The fusion of this data powers our Multi-Layered Intelligence Dashboard:
- Interactive geographic visualizations of Chronic Hotspots and Live Incidents.
- Real-time Server-Sent Events (SSE) streaming live anomalies straight to the command interface.
- High-performance, low-latency UI mapping to track every heartbeat of the city.

---

## Dashboard Previews

<div align="center">
  <img src="./map-zoomed-preview.png" alt="Zoomed Map Preview" width="45%" />
  <img src="./rounded-map-preview.png" alt="Rounded Map Preview" width="45%" />
</div>

---

## The AI & Kinematic Engine

We don't just put dots on a map. PRAVAH utilizes the **Lighthill-Whitham-Richards (LWR)** kinematic wave model to calculate the physics of traffic flow. We analyze baseline demand, residual capacity, and shockwave velocity to predict precisely when and where a bottleneck will spill over.

When a commander clicks on a high-risk node, PRAVAH invokes its **AI Tactical Copilot** (powered by Groq's sub-second Llama-3.1 inference). The LLM processes the exact geospatial and kinematic constraints of the junction, generating an instant, 3-pronged deployment strategy:
- **Infrastructural**: Immediate physical interventions (e.g., dynamic signal timing shifts).
- **Neighboural Spillover**: Pre-emptive routing changes in adjacent sectors to absorb the shockwave.
- **Behavioural**: Targeted public advisories to divert incoming commuters.

---

## Future Horizons

PRAVAH is designed as an expanding ecosystem. While we've laid the groundwork for an autonomous command center, our roadmap holds exciting possibilities:
- **Automated VMS Integration**: Direct linkage to Variable Message Signs across the city, allowing PRAVAH to autonomously broadcast AI-generated diversion routes to drivers in real-time.
- **Drone Telemetry Feed**: Integrating live aerial video feeds from BTP drones, applying computer vision to dynamically update kinematic node density without relying on static sensors.
- **Predictive Ambulance Routing**: Creating a dedicated "Green Corridor" module that actively communicates with emergency vehicles, adjusting dynamic route suggestions based on our shockwave predictions.

---

## Tech Stack & Deployment

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, React-Leaflet.
- **Backend**: Node.js, Express, Server-Sent Events (SSE).
- **AI / LLM**: Groq SDK for hyper-fast advisory synthesis.
- **Deployment**: Engineered for Vercel Serverless Functions with dynamic dataset resolution and edge compatibility.

### Local Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/sachinkmr-hub/PRAVAH.git
   cd PRAVAH
   npm install
   ```
2. **Environment Configuration**
   Create a `.env` file:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3000
   ```
3. **Launch**
   ```bash
   npm run dev
   ```

---

<div align="center">
  <em>Built by Team VISION for the National Hackathon 2026</em>
</div>
