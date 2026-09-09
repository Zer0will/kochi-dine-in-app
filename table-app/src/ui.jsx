import { useEffect, useState } from 'preact/hooks';

/** Round initial avatar. `size` = 26 | 28 | 30 */
export function Avatar({ id, color, tc, size = 26, label }) {
  return <span class={`av av-${size}`} style={{ background: color, color: tc }} aria-hidden="true">{label ?? id}</span>;
}

/** Branded fallback when menu photography is missing or unavailable. */
export function Photo({ src, alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return <div class="ph">{src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <span class="photo-fallback" aria-hidden="true">KOCHI<br /><small>PO-CHA</small></span>}</div>;
}

/** Live clock in the desktop phone frame; hidden on real phones (the OS has its own). */
export function StatusBar() {
  const [now, setNow] = useState(clock());
  useEffect(() => { const t = setInterval(() => setNow(clock()), 15000); return () => clearInterval(t); }, []);
  return (
    <div class="statusbar" aria-hidden="true">
      <span>{now}</span>
      <span class="dots">●●●</span>
    </div>
  );
}
function clock() {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TopBar({ onBack, title, sub, right }) {
  return (
    <div class="topbar">
      <button class="back" onClick={onBack} aria-label="Back">←</button>
      <div class="t"><b>{title}</b><small>{sub}</small></div>
      {right}
    </div>
  );
}

export function Toast({ text }) {
  return text ? <div class="toast" role="status">{text}</div> : null;
}
