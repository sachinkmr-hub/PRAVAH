# PRAVAH Backend

This folder owns the ASTraM ingestion, historical ML baseline, live simulation cache, and tactical intelligence API.

## Time Split

`train_model.py` and `server.js` enforce the same rule:

- Historical baseline: every available row with `start_datetime < 2024-03-02T00:00:00Z`
- Live stream cache: rows from `2024-03-02T00:00:00Z` through `2024-03-07T23:59:59Z`
- Future/live rows are never used for model training or chronic hotspot aggregation.

## Train

```bash
python backend/train_model.py
```

Outputs:

```text
backend/pravah_congestion_model.joblib
backend/pravah_static_baseline.json
```

## API

```bash
node backend/server.js
```

Endpoints:

```text
GET /api/v1/grid/chronic-hotspots
GET /api/v1/live/ping
GET /api/v1/protocols/monsoon/forecast
POST /api/v1/protocols/monsoon/forecast
POST /api/v1/protocols/planned-capacity
GET /api/v1/protocols/planned-capacity/:eventId
GET /api/v1/event/:eventId/intelligence
```

## Protocol Engines

- Monsoon Protocol: filters historical rows strictly to `event_cause == WATER_LOGGING`, clusters sinks, applies 40% capacity evaporation, detects fatal funnels, and returns pump/barricade/two-wheeler restriction actions.
- Civic Works/VIP Protocol: converts planned lane closure into displaced volume, bleed-over risk, green-wave routing, officer deployment, and delivery-app zero-flow notifications.
- Reactive Kinetic Containment: accident and breakdown intelligence now treats congestion as an asymmetric upstream shockwave and suppresses downstream deployment.
