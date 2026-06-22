"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
const HAS_MAPBOX_TOKEN =
  MAPBOX_TOKEN.length > 0 && !MAPBOX_TOKEN.includes("your_actual_token_here");

if (HAS_MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

type ThemeKey = "all" | "monsoonHit" | "civicWorks" | "accident" | "breakdown";

interface EventPoint {
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
}

interface MapBengaluruProps {
  activeTheme: ThemeKey;
  className?: string;
  style?: React.CSSProperties;
}

const BANGALORE_BOUNDS: [[number, number], [number, number]] = [
  [77.30873108, 12.8010411],
  [77.76940255, 13.2675104],
];

const FALLBACK_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    osmTiles: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osmTiles",
      type: "raster",
      source: "osmTiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const THEMES: Record<
  ThemeKey,
  { label: string; causes: string[] | null; color: string }
> = {
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

type EventFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      id: string;
      event_cause: string;
      is_match: 0 | 1;
    };
  }>;
};

export default function MapBengaluru({
  activeTheme,
  className,
  style,
}: MapBengaluruProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [events, setEvents] = useState<EventPoint[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: HAS_MAPBOX_TOKEN ? "mapbox://styles/mapbox/streets-v12" : FALLBACK_STYLE,
      center: [77.5946, 12.9716],
      zoom: 10,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.fitBounds(BANGALORE_BOUNDS, {
        padding: 40,
        duration: 2500,
        essential: true,
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      const response = await fetch("/events.json");
      const data: EventPoint[] = await response.json();

      if (!cancelled) {
        setEvents(data);
      }
    }

    loadEvents().catch(() => {
      if (!cancelled) {
        setEvents([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const theme = THEMES[activeTheme];
    const causes = theme.causes;
    const matchingEvents = causes
      ? events.filter((event) => causes.includes(event.event_cause))
      : events;

    const sourceData: EventFeatureCollection = {
      type: "FeatureCollection",
      features: events
        .filter(
          (event) =>
            Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
        )
        .map((event) => {
          const isMatch =
            causes === null || causes.includes(event.event_cause) ? 1 : 0;

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [event.longitude, event.latitude],
            },
            properties: {
              id: event.id,
              event_cause: event.event_cause,
              is_match: isMatch,
            },
          };
        }),
    };

    if (!map.getSource("events")) {
      map.addSource("events", {
        type: "geojson",
        data: sourceData,
      });
    } else {
      const source = map.getSource("events") as mapboxgl.GeoJSONSource;
      source.setData(sourceData);
    }

    if (!map.getLayer("events-circles")) {
      map.addLayer({
        id: "events-circles",
        type: "circle",
        source: "events",
        paint: {
          "circle-color": [
            "match",
            ["get", "is_match"],
            1,
            theme.color,
            "#9ca3af",
          ],
          "circle-opacity": [
            "match",
            ["get", "is_match"],
            1,
            0.9,
            0.2,
          ],
          "circle-radius": ["match", ["get", "is_match"], 1, 6, 3],
        },
      });
    }

    map.setPaintProperty("events-circles", "circle-color", [
      "match",
      ["get", "is_match"],
      1,
      theme.color,
      "#9ca3af",
    ]);
    map.setPaintProperty("events-circles", "circle-opacity", [
      "match",
      ["get", "is_match"],
      1,
      0.9,
      0.2,
    ]);
    map.setPaintProperty("events-circles", "circle-radius", [
      "match",
      ["get", "is_match"],
      1,
      6,
      3,
    ]);

    if (matchingEvents.length > 0) {
      const latitudes = matchingEvents.map((event) => event.latitude);
      const longitudes = matchingEvents.map((event) => event.longitude);

      map.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        {
          padding: 40,
          duration: 2000,
          maxZoom: 14,
          essential: true,
        }
      );
    }
  }, [activeTheme, events, mapReady]);

  return (
    <section
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "min(86vh, 920px)",
        padding: "16px",
        borderRadius: "36px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.9), rgba(233,242,255,0.92) 38%, rgba(226,236,247,0.98) 100%)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "28px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.18)",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          background: "#dbeafe",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </section>
  );
}
