"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { THEMES, type ThemeKey } from "../lib/pravah";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
const HAS_MAPBOX_TOKEN =
  MAPBOX_TOKEN.length > 0 && !MAPBOX_TOKEN.includes("your_actual_token_here");

if (HAS_MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

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

type MapBengaluruProps = {
  activeTheme?: ThemeKey;
  className?: string;
  style?: CSSProperties;
};

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

type GeoJsonFeatureCollection = {
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

const styleTag = `
  .pravah-map {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #dbeafe;
  }

  .pravah-map__canvas {
    width: 100%;
    height: 100%;
  }

  .pravah-map__watermark {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 2;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(15, 23, 42, 0.45);
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 999px;
    padding: 8px 12px;
  }
`;

export default function MapBengaluru({
  activeTheme = "all",
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
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
      map.fitBounds(BANGALORE_BOUNDS, {
        padding: 40,
        animate: true,
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
      if (!cancelled) setEvents([]);
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

    const sourceData: GeoJsonFeatureCollection = {
      type: "FeatureCollection",
      features: events
        .filter(
          (event) =>
            Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
        )
        .map((event) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [event.longitude, event.latitude],
          },
          properties: {
            id: event.id,
            event_cause: event.event_cause,
            is_match: causes === null || causes.includes(event.event_cause) ? 1 : 0,
          },
        })),
    };

    if (!map.getSource("events")) {
      map.addSource("events", {
        type: "geojson",
        data: sourceData,
      });
    } else {
      (map.getSource("events") as mapboxgl.GeoJSONSource).setData(sourceData);
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
          "circle-opacity": ["match", ["get", "is_match"], 1, 0.9, 0.2],
          "circle-radius": ["match", ["get", "is_match"], 1, 6, 3],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
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
          animate: true,
        }
      );
    }
  }, [activeTheme, events, mapReady]);

  return (
    <>
      <style>{styleTag}</style>
      <div
        className={`pravah-map${className ? ` ${className}` : ""}`}
        style={style}
      >
        <div ref={mapContainerRef} className="pravah-map__canvas" />
        <div className="pravah-map__watermark">Bengaluru / live map</div>
      </div>
    </>
  );
}
