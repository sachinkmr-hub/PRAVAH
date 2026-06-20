const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ReactMarkdown import
if (!content.includes("import ReactMarkdown")) {
  content = content.replace('import "leaflet/dist/leaflet.css";', 'import "leaflet/dist/leaflet.css";\nimport ReactMarkdown from "react-markdown";');
}

// 2. Add aiStrategyResult state and selectedEventIdRef
if (!content.includes("const [aiStrategyResult")) {
  content = content.replace('const [selectedIntelligence, setSelectedIntelligence] = useState<EventIntelligence | null>(null);', 
    'const [selectedIntelligence, setSelectedIntelligence] = useState<EventIntelligence | null>(null);\n  const selectedEventIdRef = useRef<string | null>(null);\n  const [aiStrategyResult, setAiStrategyResult] = useState<string | null>(null);');
}

// 3. Update selectedEventIdRef when selectedIntelligence changes
content = content.replace(/setSelectedIntelligence\(data\);/g, 'setSelectedIntelligence(data); selectedEventIdRef.current = data.eventId;');
content = content.replace(/setSelectedIntelligence\(null\);/g, 'setSelectedIntelligence(null); selectedEventIdRef.current = null;');

// 4. Fix timeout race condition
content = content.replace(/setActiveNotifications\(prev => prev\.filter\(n => n\.displayId !== displayId\)\);/g, 
  'setActiveNotifications(prev => prev.filter(n => n.displayId !== displayId || n.id === selectedEventIdRef.current));');

// 5. Replace alert with modal and disable button if context is empty
const alertBlock = `onClick={async () => {
                try {
                  const res = await fetch("/api/strategy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                       eventId: selectedIntelligence?.eventId,
                       density: selectedIntelligence?.kinematic_state?.baseline_demand_vph ? Math.round(selectedIntelligence.kinematic_state.baseline_demand_vph / 20) : 85,
                       velocity: selectedIntelligence?.kinematic_state?.shockwave_speed_kmh ?? 15,
                       officersAvailable: selectedIntelligence?.tactical_deployment?.officers_required ?? 45
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert("AI Strategy: \\n" + data.protocol);
                  } else {
                    alert("Error: " + data.error);
                  }
                } catch(e) {
                  alert("AI Strategy Generation failed.");
                }
              }}`;

const newBlock = `onClick={async () => {
                if (!selectedIntelligence?.eventId) return;
                try {
                  const res = await fetch("/api/strategy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                       eventId: selectedIntelligence?.eventId,
                       density: selectedIntelligence?.kinematic_state?.baseline_demand_vph ? Math.round(selectedIntelligence.kinematic_state.baseline_demand_vph / 20) : 85,
                       velocity: selectedIntelligence?.kinematic_state?.shockwave_speed_kmh ?? 15,
                       officersAvailable: selectedIntelligence?.tactical_deployment?.officers_required ?? 45
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setAiStrategyResult(data.protocol);
                  } else {
                    setAiStrategyResult("Error: " + data.error);
                  }
                } catch(e) {
                  setAiStrategyResult("AI Strategy Generation failed.");
                }
              }}
              disabled={!selectedIntelligence?.eventId}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: !selectedIntelligence?.eventId ? 'var(--bg-card)' : 'var(--accent)', color: !selectedIntelligence?.eventId ? '#666' : 'white', borderColor: 'transparent', boxShadow: !selectedIntelligence?.eventId ? 'none' : '0 0 12px rgba(14, 165, 233, 0.4)', opacity: !selectedIntelligence?.eventId ? 0.5 : 1, cursor: !selectedIntelligence?.eventId ? 'not-allowed' : 'pointer' }}`;

content = content.replace(alertBlock, newBlock);
content = content.replace(/style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var\(--accent\)', color: 'white', borderColor: 'transparent', boxShadow: '0 0 12px rgba\(14, 165, 233, 0\.4\)' }}/g, '');


// 6. Add the Modal UI
const modalUI = `
      {/* AI Strategy Modal */}
      {aiStrategyResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] border border-sky-500/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-sky-500/20 bg-[#0f172a]/50">
              <div className="flex items-center gap-3">
                <Zap className="text-sky-400" size={24} />
                <h2 className="text-xl font-bold text-white tracking-wide">PRAVAH Cognitive Synthesis</h2>
              </div>
              <button onClick={() => setAiStrategyResult(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar text-slate-200 prose prose-invert prose-sky max-w-none text-left">
              <ReactMarkdown>{aiStrategyResult}</ReactMarkdown>
            </div>
            <div className="p-4 border-t border-sky-500/20 bg-[#0f172a]/50 flex justify-end">
              <button onClick={() => setAiStrategyResult(null)} className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all">
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes("PRAVAH Cognitive Synthesis")) {
  content = content.replace('return (', 'return (\n    <>\n' + modalUI);
  const lastIndex = content.lastIndexOf(');');
  content = content.substring(0, lastIndex) + '\n    </>\n  );';
}

// 7. Update descriptive text
// "Intelligent Autonomous Grid" -> "PRAVAH: Predictive & Responsive Autonomous Vehicular Analytics Hub"
content = content.replace(/>Intelligent Autonomous Grid</g, '>PRAVAH: Predictive Autonomous Hub<');
content = content.replace(/>AI-driven real-time traffic arbitration for Bengaluru</g, '>Cognitive Synthesis & Multi-Dimensional Kinematic Simulation<');
// "Deep City Graph" -> "Sub-Second Groq LPU Inference"
content = content.replace(/>Deep City Graph</g, '>Sub-Second Groq LPU Inference<');
// "Quantum Pathfinding" -> "Multi-Dimensional Friction Analysis"
content = content.replace(/>Quantum Pathfinding</g, '>Multi-Dimensional Friction Analysis<');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Dashboard.tsx patched successfully.");
