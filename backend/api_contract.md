# Backend API Contract

The frontend currently reads `public/events.json`. When this becomes a live backend, keep the same response shape so the map component does not need to change.

## Event

```ts
type EventPoint = {
  id: string;
  latitude: number;
  longitude: number;
  event_cause: string;
  event_type: string;
  status: string;
  zone: string | null;
  corridor: string | null;
  junction: string | null;
  address: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  is_severe: boolean | number | null;
};
```

## Theme Keys

```ts
type ThemeKey =
  | "all"
  | "monsoonHit"
  | "civicWorks"
  | "accident"
  | "breakdown";
```

## Theme Cause Mapping

```json
{
  "all": null,
  "monsoonHit": ["WATER_LOGGING", "ROAD_CONDITIONS", "POT_HOLES"],
  "civicWorks": ["CONSTRUCTION", "PUBLIC_EVENT"],
  "accident": ["ACCIDENT"],
  "breakdown": ["VEHICLE_BREAKDOWN"]
}
```

## Bounds Response

```ts
type BoundsResponse = {
  theme: ThemeKey;
  count: number;
  bounds: [[number, number], [number, number]];
};
```

`bounds` uses Mapbox order:

```text
[[minLon, minLat], [maxLon, maxLat]]
```
