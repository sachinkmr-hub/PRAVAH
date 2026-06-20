<div align="center">
  <img src="public/logo.png" alt="PRAVAH Logo" width="120" height="120" />
  <h1>P R A V A H</h1>
  <p><strong>Predictive Routing & Vehicular Analytics Hub</strong></p>
  <p><em>An Elite AI Traffic Operations Copilot built for the Bengaluru Traffic Police Command Center.</em></p>
</div>

<br />

![PRAVAH Map Preview](./map-preview.png)

## 🚨 The Problem

Bengaluru's traffic ecosystem is highly volatile. The Bengaluru Traffic Police (BTP) Command Center handles thousands of daily alerts—accidents, civic works, VIP movements, and sudden monsoon deluges. Current systems are **reactive**. By the time officers are deployed, the shockwave of congestion has already cascaded into neighboring corridors, leading to gridlock.

## 🚀 The Solution: PRAVAH

**PRAVAH** transforms traffic management from a reactive scramble into a **proactive, intelligence-driven operation**. 

Powered by the **ASTRAM** dataset and advanced kinematic wave models (LWR), PRAVAH ingests historical and real-time event data to simulate traffic friction, predict secondary congestion spillovers, and generate immediate, actionable tactical advisories using state-of-the-art Generative AI.

### Key Features
- 🗺️ **Multi-Layered Intelligence Dashboard**: Interactive geographic visualization of Chronic Hotspots, Live Incidents, Weather Impacts, Civic Works, and VIP Movements.
- 🌊 **Kinematic Simulation Engine**: Utilizes the Lighthill-Whitham-Richards (LWR) model to calculate baseline demand, residual capacity, and shockwave speeds to predict bottleneck spillovers.
- 🧠 **AI Tactical Copilot**: Integrates Groq's high-speed LLMs to instantly generate infrastructural, tactical, and behavioral deployment strategies based on real-time friction data.
- ⚡ **Live Event Streaming**: Server-Sent Events (SSE) push live incident pings directly to the command dashboard for rapid response.

---

## 📸 Dashboard Previews

<div align="center">
  <img src="./map-zoomed-preview.png" alt="Zoomed Map Preview" width="45%" />
  <img src="./rounded-map-preview.png" alt="Rounded Map Preview" width="45%" />
</div>

---

## 🛠️ Tech Stack & Architecture

- **Frontend Application**: React 19, TypeScript, Vite, TailwindCSS v4, React-Leaflet.
- **Backend Simulation Engine**: Node.js, Express, Server-Sent Events (SSE).
- **Data Pipeline**: Custom CSV parsers simulating the ASTRAM event stream.
- **AI / LLM**: Groq SDK (Llama-3.1-8b) for sub-second tactical advisory generation.
- **Deployment**: Configured for Vercel Serverless Functions with dynamic dataset resolution.

### Architecture Overview
1. **Data Ingestion**: The Node backend streams and parses the massive `cleaned_astram_events.csv` file into memory, separating events into historical baselines, planned events, and a predictive queue.
2. **Kinematic Computation**: Real-time traffic events are evaluated to calculate node cascades, ghost queues, and density/velocity impact.
3. **SSE Broadcaster**: Simulated live events are broadcasted over a Server-Sent Events stream to the React frontend.
4. **AI Generation**: When a commander clicks an incident, the localized metrics (density, velocity) are passed to the Groq LLM, which formats a 3-part tactical strategy (Infrastructural, Neighboural Spillover, Behavioural).

---

## 📊 The ASTRAM Dataset

This project utilizes an anonymized and cleaned slice of the **ASTRAM Event Data**.
- Over **7,500+** real-world traffic events spanning various paradigms (`PROACTIVE`, `REACTIVE`).
- Categorized by cause: Waterlogging, Vehicle Breakdowns, Road Repairs, Protests, Signal Failures.
- Enriched with precise latitude/longitude, start/end timestamps, and severity flags.

---

## ⚙️ Local Setup & Installation

### Prerequisites
- Node.js (v20+ recommended)
- A [Groq API Key](https://console.groq.com/keys) for AI strategy generation.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sachinkmr-hub/PRAVAH.git
   cd PRAVAH
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.1-8b-instant
   PORT=3000
   ```

4. **Start the Simulation Engine & Frontend**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment

PRAVAH is configured to be deployed on **Vercel** with Serverless Functions.

- The Express backend operates dynamically inside Vercel's Serverless environment via `api/index.ts` and `vercel.json`.
- The ASTRAM dataset is bundled directly into the function limits, with fallback polling for SSE compatibility on serverless constraints.

---

<div align="center">
  <em>Built for the National Hackathon 2026</em>
</div>
