<div align="center">
  <img src="public/logo.png" alt="PRAVAH Logo" width="120" height="120" />
  <h1>P R A V A H</h1>
  <p><strong>Proactive Response And Vehicular Analytics Hub</strong></p>
  <p><em>From Reactive Chaos to Proactive Intelligence: The Next-Gen Traffic Copilot</em></p>
  <p><strong>Built by Team VISION — NSUT Delhi</strong></p>
</div>

<br />

## Architecture Philosophy: Applied AI vs. "Black Box" ML

**Why did we choose this architecture for an ML Hackathon?** 
In high-stakes civic operations like emergency traffic command, relying on a pure, "black-box" Machine Learning model is dangerous. When an ambulance is stuck, a police officer cannot act on a hallucinated prediction they don't fully understand. 

Instead of training a fragile ML model on synthetic data that fails in the real world, we built a production-ready **Applied AI Ecosystem**:
1. **Deterministic Physics & KNN Data Matching:** For traffic shockwave and queue growth predictions, we utilize established kinematic formulas driven by a **K-Nearest Neighbors (KNN)-style historical data matching algorithm**. This guarantees 100% explainable, hallucination-free metrics.
2. **Generative AI for Synthesis:** We use State-of-the-Art Large Language Models (LLaMA 3.1 via Groq) strictly as a high-speed reasoning engine. It instantly synthesizes our deterministic metrics into human-readable, tactical advisories.

**Our Vision:** We didn't build a toy ML model in a Jupyter Notebook. We engineered a scalable, full-stack pipeline that works *today* with limited public datasets, while being perfectly positioned to ingest live Computer Vision (ML) CCTV feeds tomorrow. We use Math for the physics, and AI for the reasoning.

---

![PRAVAH Map Preview](./map-preview.png)

## The Story So Far

Every day, the Bengaluru Traffic Police Command Center faces a relentless storm of data. An overturned truck on Outer Ring Road, a sudden monsoon deluge in Koramangala, an unannounced VIP convoy sweeping through MG Road. 

Historically, traffic management has suffered from **execution lag**. Authorities rely on manual calculations and radio chatter to formulate a response strategy. By the time officers and barricades are deployed, the shockwave of congestion has already paralyzed neighboring corridors.

We asked ourselves: *What if we could collapse police decision-making time from minutes to milliseconds?*

**PRAVAH** was born from this vision. We have engineered a high-velocity tactical command dashboard that bridges the gap between digital detection and physical execution. It fuses disparate intelligence streams, computes the kinematic physics of the bottleneck, and instantly dictates a deterministic deployment strategy.

## Omniscient Threat Fusion

PRAVAH escapes the limitations of a single data pipeline by harmonizing a triad of critical intelligence networks. This ensures total domain awareness:

1. **ASTRAM Notifications (Unplanned Events)**: Telemetry capturing spontaneous incidents such as vehicle breakdowns, accidents, and sudden signal failures.
2. **Planned Events Integration**: Incorporation of scheduled disruptions like protests, civic works, and VIP movements into the active monitoring layer.
3. **Historical Baseline Data**: Mapping of chronic vulnerability hotspots using historical baselines to anticipate recurring congestion points.

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

## Kinematic Engine & Tri-Lateral Framework

We don't just put dots on a map. PRAVAH utilizes the **Lighthill-Whitham-Richards (LWR)** kinematic wave model to mathematically simulate the physics of traffic flow. We calculate baseline demand against residual capacity to determine exact shockwave velocities.

When a commander selects an incident, PRAVAH invokes its sub-second AI inference to generate a **Deterministic Physical Deployment**. Rather than simple warnings, it generates a precise, **Tri-Lateral Response Framework**:
- **Infrastructural**: Exact mathematical prescription of physical barricades and automated upstream signal metering.
- **Neighboural Spillover**: Pre-emptive routing changes in adjacent sectors to absorb the shockwave.
- **Behavioural**: Mathematical adjustments for human psychology (e.g., driver rubbernecking) and targeted public advisories.

---

## Future Horizons

PRAVAH is designed as an expanding ecosystem. While we've laid the groundwork for an assistive tactical dashboard, our roadmap holds exciting possibilities:
- **Traffic Camera (CCTV) Integration**: Direct integration with existing city CCTV/ITMS traffic cameras, utilizing computer vision to map live traffic density without requiring new physical hardware.
- **Automated VMS Broadcasting**: Autonomous transmission of AI-generated diversion routes directly to city-wide Variable Message Signs (VMS), bypassing the human bottleneck.
- **Predictive 'Green Corridors'**: Active integration with emergency fleets, dynamically clearing paths for ambulances based on real-time shockwave physics rather than static routing.
- **Live Web Scraping**: Synthesizing early-warning data from civic announcements and social feeds to predict disruptions from protests, civic works, and VIP movements before they are officially logged.
- **Live Weather API Integrations**: We are actively replicating the foundation for live weather data ingestion, with the complete integration of combining real-time atmospheric readings and monsoon vulnerability maps planned for the near future.

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
