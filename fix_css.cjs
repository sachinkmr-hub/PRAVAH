const fs = require('fs');

const path = 'src/index.css';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');

const newContent = `.db-chrome-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 70px;
  justify-content: flex-end;
}
.db-chrome-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}
.db-chrome-btn:hover { background: rgba(0,0,0,0.07); }
.db-chrome-avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #1a1a1a;
  flex-shrink: 0;
}

/* ── Body ── */
.db-body {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* ── Icon Rail ── */
.db-rail {
  width: 68px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0 16px;
  gap: 4px;
  flex-shrink: 0;
  z-index: 1000;
}
.db-rail-btn {
  width: 42px; height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: all 0.18s ease;
}
.db-rail-btn:hover { background: #eaeaea; color: #444; }
.db-rail-active {
  background: #eee;
  color: #222;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.db-rail-grow { flex: 1; }

/* ── Sidebar ── */
.db-sidebar {
  width: 256px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 1000;
  box-shadow: 12px 0 40px rgba(0, 0, 0, 0.06);
}

.db-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 20px 14px;
}
.db-back-btn {
  width: 32px; height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.db-back-btn:hover { background: #f0f0f0; color: #222; }

.db-brand {
  font-family: 'Cambria Math', 'Cambria', Georgia, serif;
  font-size: 24px;
  font-weight: 500;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}`;

const start = 693; // 0-indexed: line 694
const end = 700; // 0-indexed: line 701

lines.splice(start, end - start, newContent);

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed CSS.');
