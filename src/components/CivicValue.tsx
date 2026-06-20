import React, { useEffect, useRef, useState } from "react";

interface CivicValueProps {
  theme?: "light" | "dark";
}

export const CivicValue: React.FC<CivicValueProps> = ({ theme = "light" }) => {
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { top, height } = containerRef.current.getBoundingClientRect();
      const scrollableDistance = height - window.innerHeight;
      
      if (scrollableDistance <= 0) return;
      
      let progress = -top / scrollableDistance;
      progress = Math.max(0, Math.min(1, progress));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cards = [
    {
      id: "01",
      label: "01 / MONITORING",
      title: "Real-Time Intelligence",
      body: [
        "Ingests live ASTraM event streams to monitor accidents, breakdowns, and traffic jams across the city as they happen.",
        "Provides instant alerts and visualizes congestion hotspots to help authorities respond proactively before gridlock occurs."
      ],
      accent: false,
    },
    {
      id: "02",
      label: "02 / MONSOON",
      title: "Weather Protocols",
      body: [
        "Detects water-logging incidents and instantly maps severe structural bottlenecks that trap vehicles.",
        "Recommends tactical interventions like deploying pumps, placing barricades, and restricting two-wheeler access in high-risk zones."
      ],
      accent: false,
    },
    {
      id: "03",
      label: "03 / PLANNING",
      title: "Civic Works & VIP",
      body: [
        "Simulates the impact of planned lane closures and VIP movements to calculate displaced traffic volume and bleed-over risks.",
        "Automatically coordinates green-wave routing and pushes zero-flow notifications to delivery networks."
      ],
      accent: false,
    },
    {
      id: "04",
      label: "04 / RESPONSE",
      title: "Reactive Containment",
      body: [
        "Analyzes accidents and road obstructions using kinetic wave models to predict upstream shockwaves and traffic spillback.",
        "Automatically recommends officer deployment and traffic signal adjustments to suppress downstream congestion."
      ],
      accent: true,
    },
  ];

  return (
    <div ref={containerRef} className="w-full relative bg-transparent" style={{ height: "200vh" }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className={`text-[11px] font-mono tracking-[0.2em] uppercase mb-4 ${
              isDark ? "text-sky-500" : "text-sky-600"
            }`}>Core Capabilities</p>
            <h2 className={`text-4xl sm:text-5xl font-serif font-semibold tracking-tight ${
              isDark ? "text-slate-100" : "text-neutral-900"
            }`}>Actionable Intelligence.</h2>
            <p className={`mt-4 text-lg max-w-xl mx-auto font-sans ${
              isDark ? "text-slate-400" : "text-neutral-500"
            }`}>Transforming raw traffic data into coordinated responses for Bengaluru's daily gridlock.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => {
              const start = index * 0.2;
              const end = start + 0.25;
              let cardProgress = (scrollProgress - start) / (end - start);
              cardProgress = Math.max(0, Math.min(1, cardProgress));
              
              const opacity = cardProgress;
              const translateY = 30 * (1 - cardProgress);

              return (
                <div 
                  key={card.id} 
                  style={{ opacity, transform: `translateY(${translateY}px)` }}
                  className="w-full h-full shrink-0 will-change-transform"
                >
                  <div
                    className={`civic-flow-card h-full group relative rounded-3xl p-8 shadow-sm transition-colors duration-500 flex flex-col justify-between min-h-[390px] border ${
                      card.accent
                        ? isDark
                          ? "bg-[#0B1220]/60 backdrop-blur-md border-sky-950/60 hover:border-[#0EA5E9]/50 hover:shadow-[0_20px_50px_rgba(14,165,233,0.15)] text-slate-100"
                          : "bg-white/60 backdrop-blur-md border-[#E2E8F0]/80 hover:border-[#0EA5E9]/60 hover:shadow-[0_20px_50px_rgba(14,165,233,0.08)] text-neutral-900"
                        : isDark
                          ? "bg-[#0B1220]/60 backdrop-blur-md border-sky-950/60 hover:border-sky-500/40 hover:shadow-[0_20px_50px_rgba(14,165,233,0.12)] text-slate-100"
                          : "bg-white/60 backdrop-blur-md border-[#E2E8F0]/80 hover:border-sky-400/80 hover:shadow-[0_20px_50px_rgba(14,165,233,0.06)] text-neutral-900"
                    }`}
                  >
                    <div className="space-y-5">
                      <h4 className="text-xl font-serif font-semibold leading-tight tracking-tight">
                        {card.title}
                      </h4>
                      <div className={`space-y-4 text-sm font-sans leading-relaxed ${
                        isDark ? "text-slate-400" : "text-neutral-500"
                      }`}>
                        {card.body.map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </div>
                    <div className={`mt-8 border-t pt-4 flex items-center justify-between text-[10px] font-mono tracking-wider ${
                      isDark ? "border-slate-800 text-slate-500" : "border-neutral-200/50 text-neutral-400"
                    }`}>
                      <span>PARAMETER</span>
                      <span className={`font-semibold ${
                        card.accent ? "text-[#0EA5E9]" : isDark ? "text-sky-400" : "text-neutral-600"
                      }`}>{card.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
