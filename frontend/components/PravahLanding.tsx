"use client";

import { useEffect, useState } from "react";
import DashboardMockup from "./DashboardMockup";
import { BACKEND_STAGES, FEATURE_CARDS, SCENES } from "../lib/pravah";
import styles from "./PravahLanding.module.css";

export default function PravahLanding() {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const activeScene = SCENES[activeSceneIndex];

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-pravah-scene]")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio ||
              a.boundingClientRect.top - b.boundingClientRect.top
          )[0];

        if (!visible) return;

        const nextIndex = Number(visible.target.dataset.index);
        if (!Number.isNaN(nextIndex)) {
          setActiveSceneIndex(nextIndex);
        }
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: "-28% 0px -38% 0px",
      }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Traffic isn't a grid. It's a fluid.</h1>
          <p className={styles.heroCopy}>
            <strong>PRAVAH</strong> brings <strong>deterministic</strong> physics
            to urban routing. We don't manage bottlenecks. We calculate the
            shockwave and restore the <strong>flow</strong>.
          </p>
          <a className={styles.heroButton} href="#command-center">
            Enter Command State <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
      </section>

      <section id="command-center" className={styles.story}>
        <div className={styles.stickyStage}>
          <div className={styles.copyPanel}>
            <div key={activeScene.id} className={styles.copyBlock}>
              <p className={styles.kicker}>{activeScene.eyebrow}</p>
              <h2>{activeScene.title}</h2>
              <p>{activeScene.body}</p>
            </div>
          </div>

          <div className={styles.demoPanel}>
            <DashboardMockup scene={activeScene} />
          </div>
        </div>

        <div className={styles.scrollSteps} aria-hidden="true">
          {SCENES.map((scene, index) => (
            <div
              key={scene.id}
              data-pravah-scene
              data-index={index}
              className={styles.scrollStep}
            />
          ))}
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.featureGrid}>
          {FEATURE_CARDS.map((card) => (
            <article key={card.title} className={styles.featureCard}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.backendSection}>
        <div className={styles.backendHeader}>
          <p className={styles.kicker}>Backend design</p>
          <h2>One clean event contract drives the whole surface.</h2>
        </div>

        <div className={styles.backendGrid}>
          {BACKEND_STAGES.map((stage) => (
            <article key={stage.title} className={styles.backendCard}>
              <span>{stage.label}</span>
              <h3>{stage.title}</h3>
              <p>{stage.body}</p>
              <code>{stage.signal}</code>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
