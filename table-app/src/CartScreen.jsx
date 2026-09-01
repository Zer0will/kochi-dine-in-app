import { Avatar, Photo, TopBar } from './ui.jsx';
import { fmt } from './money.js';

export function CartScreen({ s, d, act }) {
  const pct = Math.round(d.taxRate * 10000) / 100;
  const ctaLabel = s.sending ? 'Sending…' : d.unsentLines.length ? `Send round${s.roundsSent ? ` ${s.roundsSent + 1}` : ''} to kitchen` : 'Close out & pay';

  return (
    <div class="view enter-right">
      <TopBar onBack={() => act.go('menu')} title="TABLE CART" sub={`Table ${d.tableId} · ${d.people.length || 0} on check · ${d.roundLabel}`} />

      <div class="cart-scroll sc">
        {d.people.length === 0 && (
          <div class="empty-mine">Nobody is on this check yet — <button onClick={() => act.openIdentity(false)}>add your name</button></div>
        )}

        {d.people.map(p => {
          const isMe = p.id === d.currentGuestId;
          const total = p.lines.reduce((a, l) => a + l.unit * l.qty, 0);
          return (
            <div key={p.id}>
              <div class={`person${isMe ? ' me' : ''}`}>
                <Avatar {...p} size={28} />
                <span class="name">{p.name} {isMe && <span>· you</span>}</span>
                <button class="mini-switch" onClick={() => act.selectGuest(p.id)}>{isMe ? 'Ordering' : 'Order as'}</button>
                <span class="rule" />
                <span class="sub">{fmt(total)}</span>
              </div>
              {p.lines.length === 0 && <div class="empty-mine">No items yet for {p.name}.</div>}
              {p.lines.length > 0 && (
                <div class="lines">
                  {p.lines.map(l => (
                    <div class="line" key={l.key}>
                      <div class="thumb"><Photo /></div>
                      <div class="t"><b>{l.name}</b><small>{l.sent ? `round ${l.round} · sent · ` : ''}{l.desc}</small></div>
                      {l.sent || !isMe
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
            </div>
          );
        })}

        {d.canAddPeople && <button class="add-person" onClick={() => act.openIdentity(false)}>+ Add another person to check</button>}
        {!d.canAddPeople && <div class="name-hint warn">Maximum 10 people on one check.</div>}
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
