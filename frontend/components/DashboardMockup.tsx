"use client";

import MapBengaluru from "./MapBengaluru";
import { THEMES, type Scene } from "../lib/pravah";
import styles from "./DashboardMockup.module.css";

type DashboardMockupProps = {
  scene: Scene;
};

export default function DashboardMockup({ scene }: DashboardMockupProps) {
  const theme = THEMES[scene.theme];
  const showMetrics = scene.id === "deploy";

  return (
    <div className={styles.shell}>
      <div className={styles.windowBar}>
        <div className={styles.dots}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.windowActions}>
          <span>Bell</span>
          <span>Search</span>
          <strong>A</strong>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.iconRail}>
          <div className={styles.avatar} />
          <button aria-label="Dashboard" className={styles.activeIcon}>
            ::
          </button>
          <button aria-label="Cases">[]</button>
          <button aria-label="Deploy">^</button>
          <button aria-label="Settings">o</button>
        </aside>

        <aside className={styles.sidebar}>
          <h3>Flume</h3>
          <div className={styles.search}>Search</div>
          <p>Dashboard</p>

          <div className={styles.themeList}>
            {Object.values(THEMES)
              .slice(0, 4)
              .map((item) => {
                const active = item.label === theme.label;
                return (
                  <div
                    key={item.label}
                    className={active ? styles.themeActive : styles.theme}
                  >
                    <span style={{ background: item.color }} />
                    {item.label}
                    <b>-&gt;</b>
                  </div>
                );
              })}
          </div>

          <div className={styles.footerAction}>Mavoori Hill -&gt;</div>
        </aside>

        <section className={styles.mapStage}>
          <div className={styles.mapToolbar}>
            <button>State</button>
            <button>Road</button>
            <button>Filter</button>
          </div>

          <div className={styles.mapFrame}>
            <MapBengaluru
              activeTheme={scene.theme}
              style={{ width: "100%", height: "100%" }}
            />
            <div className={styles.routeRing} />
            {scene.ring ? <div className={styles.deployRing} /> : null}
            <div
              className={styles.focusDot}
              style={{ background: theme.color, boxShadow: `0 0 0 24px ${theme.color}30` }}
            />
          </div>
        </section>

        <aside className={`${styles.metrics} ${showMetrics ? styles.metricsOn : ""}`}>
          {scene.metrics.map((metric, index) => (
            <div key={`${metric.label}-${index}`} className={styles.metricCard}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
