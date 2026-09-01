import { Avatar, Photo } from './ui.jsx';
import { fmt } from './money.js';

export function MenuScreen({ menu, s, d, act }) {
  const cat = d.category;
  return (
    <div class="view enter-fade">
      <div class="menu-head">
        <div class="brand-row">
          <div class="brand">코치<span>포차</span></div>
          <div class="table-tag">TABLE {d.tableId} · {d.people.length}/{d.maxPeople} ON CHECK</div>
        </div>
        <button class="party" onClick={() => act.openIdentity(false)} aria-label="People on this check">
          <span class="av-stack">
            {d.people.slice(0, 4).map(p => <Avatar key={p.id} {...p} />)}
            {!d.people.length && <span class="av av-26 av-empty">+</span>}
            {d.people.length > 4 && <Avatar id="+" color="#3a3a44" tc="#f6eede" label={`+${d.people.length - 4}`} />}
          </span>
          <span class="label">{d.currentGuest ? `Ordering as ${d.currentGuest.name}` : 'Tap to add your name'}</span>
          <span class="link">{d.canAddPeople ? 'Join' : 'Full'}</span>
        </button>
      </div>

      <div class="menu-body">
        <nav class="rail sc" aria-label="Menu categories">
          {menu.categories.map((c, i) => (
            <button key={c.key} class={`cat${i === s.cat ? ' active' : ''}`} onClick={() => act.setCat(i)} aria-pressed={i === s.cat}>
              <span class="kr">{c.kr}</span>
              <span class="en">{c.en}</span>
            </button>
          ))}
        </nav>

        <section class="grid-wrap sc" key={cat.key} aria-label={cat.en}>
          <div class="section-head">
            <span class="en">{cat.en}</span>
            <span class="kr">{cat.sub}</span>
          </div>
          <div class="grid">
            {cat.items.map(it => (
              <button key={it.id} class="card" onClick={() => act.openSheet(it.id)}>
                <div class="art">
                  <Photo src={it.photo} alt="" />
                  {it.korean && <span class="kr">{it.korean}</span>}
                  {it.badge && <span class="badge">{it.badge}</span>}
                </div>
                <div class="body">
                  <div class="name">{it.name}</div>
                  <div class="foot">
                    <span class="price">{fmt(it.price)}</span>
                    <span class="plus" aria-hidden="true">+</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {d.cartCount > 0 && (
        <button class="cartbar" onClick={() => act.go('cart')}>
          <span class="count" key={d.cartCount}>{d.cartCount}</span>
          <span class="t">
            <b>Table cart · {d.ordering || 1} ordering</b>
            <small>{s.roundsSent ? `Round ${s.roundsSent} sent · add round ${s.roundsSent + 1}` : "Send to kitchen when everyone's in"}</small>
          </span>
          <span class="total">{fmt(d.subtotal)}</span>
        </button>
      )}
    </div>
  );
}
