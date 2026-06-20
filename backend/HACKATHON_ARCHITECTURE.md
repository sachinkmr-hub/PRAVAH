# PRAVAH 2.0 — Deterministic Urban Response Simulation

PRAVAH is a decision-support simulation for explaining how historical Astram records can become reproducible traffic-response recommendations. It does not claim direct control of police, signals, or navigation providers.

## Judge-facing architecture

```text
Astram CSV
   │ schema validation + canonical normalization
   ▼
Reproducible memory snapshot ──► spatial historical evidence
   │                                  │
   ├── planned-event clusters         │ actual nearby event count
   ├── reactive replay pool           │ median observed duration
   └── readiness/data-quality         │ observation window
                                      ▼
Event + inferred road profile + seeded demand
   │
   ├── residual capacity
   ├── queue growth
   ├── kinematic shockwave estimate
   ├── task-based control points
   └── capacity-gated diversion proposal
          │
          ▼
Tactical payload + confidence + assumptions + human-approval flag
```

The same event, simulation timestamp and seed always produce the same recommendation. This makes the demo replayable, testable and auditable.

## Data truth levels

Every intelligence response explicitly separates:

1. **Observed:** event coordinates, cause, severity, timestamps and matching historical records from the supplied dataset.
2. **Inferred:** road class, lane count and speed based on corridor/address taxonomy.
3. **Simulated:** demand, residual alternate capacity and resulting queue behavior.
4. **Required validation:** lane position, road connectivity, field taper approval and signal/operator authorization.

The API returns `decision_metadata.mode`, confidence, model version, seed, assumptions and `requires_human_approval` so a simulated value cannot masquerade as a sensor measurement.

## Mathematical pipeline

For an inferred road profile with `n` lanes, per-lane capacity `c`, deterministic demand factor `f`, open lanes `o`, and weather factor `w`:

```text
baseline demand Qᵢ = n × c × f
residual capacity Qₒ = o × c × w
queue growth = max(0, Qᵢ − Qₒ)
shockwave speed = (Qₒ − Qᵢ) / (Kcongested − Kfree)
```

The diversion is recommended only when its simulated allocation remains at or below 85% of alternate residual capacity. Otherwise the engine returns `No capacity-safe alternate established` instead of inventing certainty.

Taper and device counts use an explicitly labelled **PRAVAH simulation safety policy**. They are not presented as statutory field designs.

## Live incident flow

`GET /api/v1/events/stream` establishes a Server-Sent Events channel. The server—not the browser—owns event ordering and emits an `astram.incident` envelope containing:

- monotonic sequence number;
- wall-clock emission timestamp;
- simulation timestamp;
- normalized event payload.

`POST /api/v1/simulate/astram` produces an immediate replay event for a live demonstration. Automatic emission occurs every five seconds while clients are connected.

## Core endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Process liveness |
| `GET /api/ready` | Ingestion readiness, accepted/rejected counts and model version |
| `GET /api/v1/grid/state` | Atomic macro-state payload |
| `GET /api/v1/grid/chronic-hotspots` | Historical spatial aggregates |
| `GET /api/v1/grid/layer/:category` | Planned-event clusters |
| `GET /api/v1/event/:id/intelligence` | Reproducible tactical simulation |
| `GET /api/v1/events/stream` | Live Astram SSE stream |
| `POST /api/v1/simulate/astram` | Manual incident replay trigger |

## Five-minute demonstration

1. Open the dashboard and show the `ready` snapshot: 8,173 validated records and zero rejected records for the current dataset.
2. Select a planned cluster to explain proactive staging.
3. Select an event and walk through historical evidence, residual capacity, queue growth, shockwave estimate and confidence.
4. Trigger `POST /api/v1/simulate/astram`; show the incident arrive through the server stream without refresh.
5. Repeat the same event to demonstrate deterministic output.
6. Highlight the failure-safe branch: when capacity is insufficient, PRAVAH declines to fabricate a diversion.

## Verification

```bash
npm test
npm run lint
npm run build
```

The test suite covers invalid-row rejection, interval-based urgency, real spatial historical matching, deterministic output, bounded lane closures and mandatory governance metadata.
