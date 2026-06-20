"use client";

import { useState } from "react";
import MapBengaluru from "../components/MapBengaluru";

type ThemeKey = "all" | "monsoonHit" | "civicWorks" | "accident" | "breakdown";

const THEME_BUTTONS: Array<{ key: ThemeKey; label: string }> = [
  { key: "all", label: "All events" },
  { key: "monsoonHit", label: "Monsoon hit" },
  { key: "civicWorks", label: "Civic works" },
  { key: "accident", label: "Accidents" },
  { key: "breakdown", label: "Breakdowns" },
];

export default function DashboardPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("all");

  return (
    <main
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: "280px",
          flexShrink: 0,
          borderRight: "1px solid #e5e7eb",
          padding: "16px",
          background: "#ffffff",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>
          Bengaluru Event Radar
        </h1>
        <h2 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 16px 0", color: "#4b5563" }}>
          Themes
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {THEME_BUTTONS.map((button) => {
            const isActive = activeTheme === button.key;

            return (
              <button
                key={button.key}
                type="button"
                onClick={() => setActiveTheme(button.key)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  textAlign: "left",
                  background: isActive ? "#e5e7eb" : "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <MapBengaluru activeTheme={activeTheme} />
      </section>
    </main>
  );
}
