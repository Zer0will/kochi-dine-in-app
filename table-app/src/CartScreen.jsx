import { Avatar, Photo, TopBar } from './ui.jsx';
import { ME } from './config.js';
import { fmt } from './money.js';

export function CartScreen({ s, d, act }) {
  const pct = Math.round(d.taxRate * 10000) / 100;
  const ctaLabel = s.sending ? 'Sending…' : d.unsentLines.length ? `Send round${s.roundsSent ? ` ${s.roundsSent + 1}` : ''} to kitchen` : 'Close out & pay';

  return (
    <div class="view">
      <TopBar onBack={() => act.go('menu')} title="TABLE CART" sub={`Table ${d.tableId} · one bill · ${d.roundLabel}`}
        right={<span class="live"><i />LIVE</span>} />

      <div class="cart-scroll sc">
        <div class="person">
          <Avatar {...ME} size={28} />
          <span class="name">{ME.name} <span>· you</span></span>
          <span class="rule" />
          <span class="sub">{fmt(d.mySub)}</span>
        </div>
        {s.myLines.length === 0 && (
          <div class="empty-mine">Nothing yet — <button onClick={() => act.go('menu')}>add from the menu</button></div>
        )}
        {s.myLines.length > 0 && (
          <div class="lines">
            {s.myLines.map(l => (
              <div class="line" key={l.key}>
                <div class="thumb"><Photo /></div>
                <div class="t"><b>{l.name}</b><small>{l.sent ? `round ${l.round} · sent · ` : ''}{l.desc}</small></div>
                {l.sent
                  ? <span class="qtys">×{l.qty}</span>
                  : (
                    <div class="pill-step">
                      <button class="dec" onClick={() => act.qty(l.key, -1)} aria-label={l.qty === 1 ? 'Remove' : 'Fewer'}>−</button>
                      <span>{l.qty}</span>
                      <button onClick={() => act.qty(l.key, 1)} aria-label="More">+</button>
                    </div>
                  )}
                <span class="amt">{fmt(l.unit * l.qty)}</span>
              </div>
            ))}
          </div>
        )}

        {d.others.map(p => (
          <div key={p.id}>
            <div class="person">
              <Avatar {...p} size={28} />
              <span class="name">{p.name}</span>
              <span class="rule" />
              {p.lines.length
                ? <span class="sub">{fmt(p.lines.reduce((a, l) => a + l.unit * l.qty, 0))}</span>
                : <span class="sub picking">still picking…</span>}
            </div>
            {p.lines.length > 0 && (
              <div class="lines">
                {p.lines.map((l, i) => (
                  <div class="line" key={i}>
                    <div class="thumb"><Photo /></div>
                    <div class="t"><b>{l.name}</b><small>{l.korean}{l.shared ? ' · shared' : ''}</small></div>
                    <span class="qtys">×{l.qty}</span>
                    <span class="amt">{fmt(l.unit * l.qty)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {s.sendNote && <div class="sent-banner">✓ {s.sendNote}</div>}
      </div>

      <div class="bottombar">
        <div class="sumrow"><span>Subtotal</span><b>{fmt(d.subtotal)}</b></div>
        <div class="sumrow"><span>Tax ({pct}%)</span><b>{fmt(d.tax)}</b></div>
        <div class="totalrow"><span>Total so far</span><b>{fmt(d.preTip)}</b></div>
        <div class="cta-row">
          <button class="btn-ghost" onClick={() => act.go('menu')}>Add more</button>
          <button class="btn-primary" onClick={act.cartCta} disabled={s.sending || (!d.unsentLines.length && !d.cartCount)}>
            <span>{ctaLabel}</span><span>→</span>
          </button>
        </div>
        <div class="foot-note">Pay at the end — one bill or split by person</div>
      </div>
    </div>
  );
}
