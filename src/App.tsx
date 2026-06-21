import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlowBackground } from "./components/FlowBackground";
import { Scrollytelling } from "./components/Scrollytelling";
import { CivicValue } from "./components/CivicValue";
import { Activity, LayoutDashboard, X } from "lucide-react";

export default function App() {
  const navigate = useNavigate();
  const [bgSpeed, setBgSpeed] = useState<number>(1.0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeSection, setActiveSection] = useState("Technology");

  // Auth state
  const [showSignIn, setShowSignIn] = useState(false);
  const [loginId, setLoginId] = useState("sachin@bengaluru");
  const [loginPwd, setLoginPwd] = useState("bengaluru@123");
  const [loginError, setLoginError] = useState("");

  const handleDashboardClick = () => {
    // UX Override: Persist unified login gate to enforce session verification.
    setShowSignIn(true);
  };

  const isDark = theme === "dark";

  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const command = document.getElementById("scrollytelling-section");
          const about = document.getElementById("about-section");
          
          const scrollY = window.scrollY + window.innerHeight / 3;
          if (about && scrollY >= about.offsetTop) {
            setActiveSection("About");
          } else if (command && scrollY >= command.offsetTop) {
            setActiveSection("Command");
          } else {
            setActiveSection("Technology");
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToOperation = () => {
    const scrollySec = document.getElementById("scrollytelling-section");
    if (scrollySec) {
      scrollySec.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={`relative min-h-screen selection:bg-sky-500/20 font-sans antialiased ${
      isDark ? "text-slate-200" : "text-neutral-800"
    }`}>
      {/* Canvas silk-wave background — handled by FlowBackground */}

      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-500 ${
        isDark ? "bg-[#040810]/80 border-sky-950/40" : "bg-white/80 border-slate-200/60"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 flex items-center justify-center transition-all`}>
              <img src="/logo.png" alt="Pravah Logo" className={`w-8 h-8 object-contain ${isDark ? "mix-blend-screen invert opacity-90" : "mix-blend-multiply"}`} />
            </div>
            <span className={`pravah-wordmark ${
              isDark ? "text-slate-100" : "text-neutral-900"
            }`}>P R Λ V Λ H</span>
          </div>

          <nav className="hidden lg:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
            {["Technology", "Command", "About"].map((link) => (
              <button key={link} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSection === link 
                  ? (isDark ? "text-slate-100 border border-slate-600" : "text-neutral-900 border border-neutral-800")
                  : (isDark ? "text-slate-400 hover:text-slate-100 hover:bg-sky-950/50" : "text-neutral-500 hover:text-neutral-900 hover:bg-slate-100/80")
              }`}>{link}</button>
            ))}
          </nav>

          <button
            onClick={handleDashboardClick}
            aria-label="Open live dashboard"
            className="dashboard-jump-button"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      <FlowBackground speedMultiplier={bgSpeed} theme={theme} />

      <div className="relative z-10">
        <section id="hero-section" className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="w-full text-center max-w-[1500px] space-y-8 animate-fade-up-1">
            <div className="inline-flex items-center space-x-2 bg-sky-500/8 border border-sky-500/25 rounded-full px-5 py-2 max-w-max mx-auto">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
              </span>
              <span className="text-[11px] font-mono tracking-[0.12em] font-bold text-sky-600 uppercase">LIVE · BENGALURU TRANSIT COMMAND</span>
            </div>

            <h1 className={`pravah-hero-title text-[3.5rem] sm:text-[4.8rem] lg:text-[5.8rem] xl:text-[6.5rem] font-cambria-math font-medium tracking-tight leading-[1.05] transition-all duration-700 ${
              isDark ? "text-slate-100 drop-shadow-[0_4px_30px_rgba(56,189,248,0.08)]" : "text-[#111827]"
            }`} style={{ textWrap: 'balance' } as React.CSSProperties}>
              <span className="hero-main-line">Traffic is no longer a knot.</span>
                              <span className={`pravah-flow-title transition-all duration-700 font-plusjakarta font-normal italic mt-1 block ${
                isDark ? "bg-gradient-to-r from-sky-300 via-cyan-400 to-blue-300 bg-clip-text text-transparent" : "text-[#0EA5E9]"
              }`}>It is a fluid.</span>
            </h1>

            <p className={`max-w-xl mx-auto text-lg leading-relaxed font-sans font-normal transition-all duration-700 ${
              isDark ? "text-slate-400" : "text-[#555555]"
            }`}>
              PRAVAH is an interactive transit command center prototype. We map urban congestion using traffic cluster data and generate simulated AI-driven routing strategies to untangle city bottlenecks.
            </p>

            <div className="flex flex-col items-center justify-center pt-4 animate-fade-up-2">
              <button
                onClick={handleScrollToOperation}
                onMouseEnter={() => setBgSpeed(3.0)}
                onMouseLeave={() => setBgSpeed(1.0)}
                id="btn_trigger_command_state"
                className="glass-pill-cta"
              >
                INITIALIZE PRAVAH
              </button>
            </div>
          </div>
        </section>

        <section id="scrollytelling-section" className={`relative border-t border-b py-12 transition-all duration-700 ${
          isDark ? "bg-[#080E1C]/35 border-sky-950/60 backdrop-blur-md" : "bg-white/30 backdrop-blur-sm border-neutral-200/50"
        }`}>
          <Scrollytelling theme={theme} />
        </section>

        <section id="about-section" className="relative py-12">
          <CivicValue theme={theme} />
        </section>

        <footer className={`border-t transition-all duration-700 ${
          isDark ? "border-sky-950/50 bg-[#03060C]/60" : "border-neutral-200 bg-neutral-50/80"
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 flex items-center justify-center`}>
                  <img src="/logo.png" alt="Pravah Logo" className={`w-7 h-7 object-contain ${isDark ? "mix-blend-screen invert opacity-90" : "mix-blend-multiply"}`} />
                </div>
                <div>
                  <p className={`pravah-wordmark ${
                    isDark ? "text-slate-100" : "text-neutral-900"
                  }`}>P R Λ V Λ H</p>
                  <p className={`text-[10px] tracking-[0.15em] font-mono uppercase mt-0.5 opacity-80 ${
                    isDark ? "text-slate-400" : "text-neutral-600"
                  }`}>Proactive Response And Vehicular Analytics Hub</p>
                  <p className={`text-[12px] font-sans font-medium mt-1.5 ${
                    isDark ? "text-rose-400" : "text-rose-600"
                  }`}>PRAVAH hai – hume aapki PARVAH hai ❤️</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {["Technology", "Command Center", "Privacy", "Contact"].map((item) => (
                  <button key={item} className={`text-xs font-mono tracking-wider transition-colors duration-200 ${
                    isDark ? "text-slate-500 hover:text-slate-200" : "text-neutral-400 hover:text-neutral-800"
                  }`}>{item}</button>
                ))}
              </div>
              <p className={`text-[11px] font-mono tracking-wider whitespace-nowrap ${
                isDark ? "text-slate-600" : "text-neutral-400"
              }`}>© 2026 PRAVAH SYSTEMS</p>
            </div>
            <div className={`mt-8 pt-6 border-t ${
              isDark ? "border-sky-950/40" : "border-neutral-200/70"
            }`}>
              <p className={`text-[10px] font-mono text-center tracking-wider ${
                isDark ? "text-slate-700" : "text-neutral-300"
              }`}>Deterministic physics for urban routing · LWR Model v2.1 · All rights reserved</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Glassmorphism SignIn Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030816]/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative max-w-md w-full rounded-3xl p-8 border transition-all ${
            isDark ? "bg-[#0B1220]/40 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_0_50px_rgba(14,165,233,0.08)]" : "bg-white/30 border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.1),inset_0_0_50px_rgba(255,255,255,0.5)]"
          } backdrop-blur-2xl overflow-hidden`}>
            {/* Ambient Inner Flowing Glow */}
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 pointer-events-none"></div>
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-sky-400/20 blur-[50px] rounded-full animate-pulse pointer-events-none mix-blend-screen"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[50px] rounded-full animate-pulse pointer-events-none mix-blend-screen" style={{ animationDelay: '2s' }}></div>

            <button 
              onClick={() => setShowSignIn(false)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${
                isDark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-black/10"
              }`}
            >
              <X size={20} />
            </button>
            <div className="text-center mb-8 relative z-10">
              <h2 className={`text-3xl font-serif mb-2 ${isDark ? "text-slate-50 drop-shadow-md" : "text-neutral-900 drop-shadow-md"}`}>PRAVAH Secure Access</h2>
              <p className="text-[#0EA5E9] text-sm font-mono tracking-wider font-bold drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]">COMMAND CENTER LOGIN</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (loginId === "sachin@bengaluru" && loginPwd === "bengaluru@123") {
                localStorage.setItem("pravah_auth", loginId);
                setShowSignIn(false);
                navigate('/dashboard');
              } else {
                setLoginError("Invalid credentials. Access denied.");
              }
            }} className="space-y-6 relative z-10">
              <div>
                <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-sky-200/70" : "text-sky-900/70 font-bold"}`}>Operator ID</label>
                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/80 transition-all ${
                  isDark ? "bg-black/30 border border-white/5 text-slate-100 placeholder:text-slate-600 shadow-inner" : "bg-white/50 border border-white/40 text-neutral-900 placeholder:text-neutral-500 shadow-inner"
                }`} placeholder="Enter Operator ID" />
              </div>
              <div>
                <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-sky-200/70" : "text-sky-900/70 font-bold"}`}>Security Key</label>
                <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/80 transition-all ${
                  isDark ? "bg-black/30 border border-white/5 text-slate-100 placeholder:text-slate-600 shadow-inner" : "bg-white/50 border border-white/40 text-neutral-900 placeholder:text-neutral-500 shadow-inner"
                }`} placeholder="Enter Security Key" />
              </div>
              {loginError && <p className="text-rose-400 text-sm font-medium text-center bg-rose-950/40 py-2 rounded-lg border border-rose-500/30 backdrop-blur-md shadow-lg">{loginError}</p>}
              <button type="submit" className="w-full relative group overflow-hidden rounded-xl p-[1px]">
                <span className="absolute inset-0 bg-gradient-to-r from-[#0EA5E9] via-[#38BDF8] to-[#0284C7] rounded-xl opacity-70 group-hover:opacity-100 blur-sm transition-opacity duration-500"></span>
                <div className="relative bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0EA5E9] text-white rounded-xl py-3 font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(14,165,233,0.4)] z-10 flex items-center justify-center">
                  <span>Authenticate</span>
                </div>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
