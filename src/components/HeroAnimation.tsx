import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Activity, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isParallel, setIsParallel] = useState<boolean>(true); // state controls loop
  const isParallelRef = useRef(isParallel);
  const [flowSpeed, setFlowSpeed] = useState<number>(1.2);

  // Sync ref to avoid stale event callback capture
  useEffect(() => {
    isParallelRef.current = isParallel;
  }, [isParallel]);

  // Automatic slow breathing cycle: untangle and tangle
  useEffect(() => {
    const timer = setInterval(() => {
      setIsParallel((prev) => !prev);
    }, 6000); // 6 seconds per state for elegant viewing
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = 720);
    let height = (canvas.height = 360);

    const resize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight || 360;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    // Setup lanes of vehicle streams
    const laneCount = 10;
    const pointsPerLane = 45;
    
    // Discrete particles (cars) flowing along the lanes
    const carCount = 70;
    const cars: Array<{
      laneIndex: number;
      u: number; // progress along lane (0 to 1)
      speed: number;
      size: number;
    }> = [];

    for (let i = 0; i < carCount; i++) {
      cars.push({
        laneIndex: i % laneCount,
        u: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        size: 3 + Math.random() * 2,
      });
    }

    let animationFrameId: number;
    let transitionValue = 1.0; // 0.0 = complete knot gridlock, 1.0 = laminar parallel flows
    let time = 0;

    const animate = () => {
      time += 0.015 * flowSpeed;
      const targetVal = isParallelRef.current ? 1.0 : 0.0;
      
      // Ultra-smooth easing mimic fluid water washing
      transitionValue += (targetVal - transitionValue) * 0.035;

      ctx.fillStyle = "#FAFBFD"; // Pristine fluid canvas background
      ctx.fillRect(0, 0, width, height);

      // Technical Grid Overlay
      ctx.strokeStyle = "rgba(15, 23, 42, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw mathematical flow lanes (The Fluid Lines)
      for (let l = 0; l < laneCount; l++) {
        const laneOffset = l / laneCount;
        
        ctx.beginPath();
        
        // Render detailed curve nodes
        for (let p = 0; p <= pointsPerLane; p++) {
          const u = p / pointsPerLane; // progress across screen x-axis
          
          // 1. Parallel state: straight laminar flows with a micro sine-wave ripple
          const xParallel = u * width;
          const yParallel = (height * 0.12) + (l * (height * 0.76) / (laneCount - 1)) + 
                            Math.sin(u * 5 + time + l * 0.5) * 8;

          // 2. Chaotic Knot state: spiral coordinate math wrapping tightly around hot center
          const cx = width / 2;
          const cy = height / 2;
          
          // Spiral angle wraps multiple times based on progress
          const spiralRotations = 3.5;
          const theta = u * Math.PI * 2 * spiralRotations + time * 0.8 + l * (Math.PI * 2 / laneCount);
          
          // Tighter radius near center, widening at outskirts
          const baseRadius = 25 + u * 80;
          // Brownian micro ripples representing turbulent traffic bottleneck
          const noise = Math.sin(u * 20 - time * 2) * 4 + Math.cos(l * 5 + time) * 3;
          const radius = baseRadius + noise;

          const xChaos = cx + Math.cos(theta) * radius;
          const yChaos = cy + Math.sin(theta) * radius;

          // Interpolated coordinate transition
          const finalX = xParallel * transitionValue + xChaos * (1.0 - transitionValue);
          const finalY = yParallel * transitionValue + yChaos * (1.0 - transitionValue);

          if (p === 0) {
            ctx.moveTo(finalX, finalY);
          } else {
            ctx.lineTo(finalX, finalY);
          }
        }

        // Color transition: Hot orange-red during chaos, elegant cerulean-blue during parallel flow
        // Interpolate RGBA values
        const r = Math.floor(239 * (1.0 - transitionValue) + 35 * transitionValue);
        const g = Math.floor(68 * (1.0 - transitionValue) + 149 * transitionValue);
        const b = Math.floor(68 * (1.0 - transitionValue) + 235 * transitionValue);
        const opacity = 0.15 + (1.0 - transitionValue) * 0.1; // thicker/bolder during chaos

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = isParallel ? 1.5 : 2.5;
        ctx.stroke();
      }

      // Draw the Flow Cars (particles) running continuous along lanes
      cars.forEach((car) => {
        car.u += car.speed * flowSpeed;
        if (car.u > 1.0) {
          car.u = 0;
        }

        const l = car.laneIndex;
        const u = car.u;

        // Calculate coordinates of this exact particle using identical math interpolation
        const xParallel = u * width;
        const yParallel = (height * 0.12) + (l * (height * 0.76) / (laneCount - 1)) + 
                          Math.sin(u * 5 + time + l * 0.5) * 8;

        const cx = width / 2;
        const cy = height / 2;
        const spiralRotations = 3.5;
        const theta = u * Math.PI * 2 * spiralRotations + time * 0.8 + l * (Math.PI * 2 / laneCount);
        const baseRadius = 25 + u * 80;
        const noise = Math.sin(u * 20 - time * 2) * 4 + Math.cos(l * 5 + time) * 3;
        const radius = baseRadius + noise;

        const xChaos = cx + Math.cos(theta) * radius;
        const yChaos = cy + Math.sin(theta) * radius;

        const finalX = xParallel * transitionValue + xChaos * (1.0 - transitionValue);
        const finalY = yParallel * transitionValue + yChaos * (1.0 - transitionValue);

        // Core car color
        const r = Math.floor(251 * (1.0 - transitionValue) + 14 * transitionValue);
        const g = Math.floor(146 * (1.0 - transitionValue) + 165 * transitionValue);
        const b = Math.floor(60 * (1.0 - transitionValue) + 233 * transitionValue);

        ctx.beginPath();
        ctx.arc(finalX, finalY, car.size * (1.2 - transitionValue * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();

        // Neon halo glow matching state
        ctx.beginPath();
        ctx.arc(finalX, finalY, car.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        ctx.fill();
      });

      // Render flowing vortex field lines to make the "fluid" aesthetic extremely convincing
      if (transitionValue < 0.4) {
        // Draw centered dynamic spiral arrows and vortex energy lines
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 20 + Math.sin(time) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Mathematical parameter metrics in bottom coordinates
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText(
        `LWR SOLVER RHO STATE: ${transitionValue.toFixed(4)} | STREAMLINES: ${laneCount} | VELOCITY COEFF: ${flowSpeed.toFixed(2)}x`,
        16,
        height - 16
      );

      ctx.fillText(
        `GRID ENERGY COMPRESSION: ${((1.0 - transitionValue) * 380).toFixed(1)} kW/rad`,
        width - 240,
        height - 16
      );

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [flowSpeed]);

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-neutral-100 bg-white/60 p-5 shadow-xl backdrop-blur-md">
      {/* Simulation Window Header with status flags */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-neutral-100/80 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          {isParallel ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
          <span className="text-xs font-mono text-neutral-500 font-bold tracking-tight">
            PRAVAH_LWR_SIMULATION_BRIDGE.iso
          </span>
        </div>
        
        {/* Dynamic Speed Controller and State Switches */}
        <div className="flex items-center space-x-4 self-end sm:self-center">
          <div className="flex items-center space-x-2 text-[10px] font-mono text-neutral-400">
            <span>Viscosity:</span>
            <button 
              onClick={() => setFlowSpeed((prev) => Math.max(0.5, prev - 0.3))}
              className="px-1.5 py-0.5 bg-neutral-100/80 hover:bg-neutral-200/80 rounded transition"
            >
              -
            </button>
            <span className="text-neutral-700 font-bold font-sans">{flowSpeed.toFixed(1)}x</span>
            <button 
              onClick={() => setFlowSpeed((prev) => Math.min(3.0, prev + 0.3))}
              className="px-1.5 py-0.5 bg-neutral-100/80 hover:bg-neutral-200/80 rounded transition"
            >
              +
            </button>
          </div>

          <div className="flex space-x-1.5 text-[10px] font-mono">
            <button
              onClick={() => setIsParallel(false)}
              id="btn_sim_gridlock"
              className={`px-3 py-1 rounded-full transition duration-300 font-semibold border ${
                !isParallel 
                  ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm" 
                  : "text-neutral-500 border-transparent hover:bg-neutral-100"
              }`}
            >
              Gridlock
            </button>
            <button
              onClick={() => setIsParallel(true)}
              id="btn_sim_laminar"
              className={`px-3 py-1 rounded-full transition duration-300 font-semibold border ${
                isParallel 
                  ? "bg-sky-50 border-sky-200 text-sky-600 shadow-sm" 
                  : "text-neutral-500 border-transparent hover:bg-neutral-100"
              }`}
            >
              Laminar
            </button>
          </div>
        </div>
      </div>

      <div className="relative h-[300px] sm:h-[350px] w-full rounded-xl overflow-hidden bg-neutral-50/20">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        
        {/* Physical parameter annotation block */}
        <div className="absolute top-4 left-4 pointer-events-none bg-white/95 border border-neutral-100/80 rounded-xl py-2 px-3.5 shadow-lg backdrop-blur-sm transition-all max-w-[210px]">
          <div className="flex items-center space-x-1.5">
            {isParallel ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              LWR Boundary Mode
            </span>
          </div>
          <p className={`text-sm font-serif leading-none mt-1.5 font-black ${isParallel ? "text-sky-600" : "text-rose-600"}`}>
            {isParallel ? "Laminar Streamlines" : "Complex Spiral Knot"}
          </p>
          <p className="text-[10px] font-sans text-neutral-500 mt-1 leading-normal">
            {isParallel 
              ? "All vectors untangled. Continuous parallel flow established." 
              : "Vehicles trapped inside dynamic bottleneck shock vortex."}
          </p>
          <div className="mt-2 pt-1.5 border-t border-neutral-100 flex justify-between text-[8px] font-mono text-neutral-400">
            <span>DENSITY RHO</span>
            <span className={isParallel ? "text-emerald-500" : "text-rose-500"}>
              {isParallel ? "Optimal (~35 v/km)" : "Gridlock (~185 v/km)"}
            </span>
          </div>
        </div>

        {/* Dynamic interactive warning ticker */}
        <div className="absolute bottom-4 right-4 pointer-events-none bg-neutral-900/90 text-white rounded-lg p-2 text-[9px] font-mono shadow-md backdrop-blur-sm max-w-[200px]">
          <p className="text-neutral-400 text-[8px] uppercase tracking-wide">Flow Diagnostic</p>
          <p className={isParallel ? "text-emerald-400 mt-0.5" : "text-rose-400 mt-0.5"}>
            ● {isParallel ? "Perfect numerical distribution" : "Upstream wave speed estimated at -15.4 km/h"}
          </p>
        </div>
      </div>
    </div>
  );
};

