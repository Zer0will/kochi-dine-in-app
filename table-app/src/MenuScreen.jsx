import { Avatar, Photo } from './ui.jsx';
import { ME, SEATED } from './config.js';
import { fmt } from './money.js';

export function MenuScreen({ menu, s, d, act }) {
  const cat = d.category;
  return (
    <div class="view enter-fade">
      <div class="menu-head">
        <div class="brand-row">
          <div class="brand">코치<span>포차</span></div>
          <div class="table-tag">TABLE {d.tableId}{d.seeded ? ` · ${SEATED} SEATED` : ''}</div>
        </div>
        {d.seeded && (
          <button class="party" onClick={() => d.cartCount ? act.go('cart') : null} aria-label="Guests at this table">
            <span class="av-stack">
              <Avatar {...ME} />
              {d.others.map(p => <Avatar key={p.id} {...p} />)}
              {SEATED > d.people.length && <Avatar id="+1" color="#3a3a44" tc="#f6eede" label={`+${SEATED - d.people.length}`} />}
            </span>
            <span class="label">Ordering together · one bill</span>
            <span class="link">Split</span>
          </button>
        )}
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

      {/* Only surface the floating cart once *I* have ordered — seeded demo guests
          shouldn't make the CTA show items/total before I add my own item. */}
      {d.myCount > 0 && (
        <button class="cartbar" onClick={() => act.go('cart')}>
          <span class="count" key={d.cartCount}>{d.cartCount}</span>
          <span class="t">
            <b>{d.seeded ? `Table cart · ${d.ordering} ordering` : 'Your order'}</b>
            <small>{s.roundsSent ? `Round ${s.roundsSent} sent · add round ${s.roundsSent + 1}` : "Send to kitchen when everyone's in"}</small>
          </span>
          <span class="total">{fmt(d.subtotal)}</span>
        </button>
      )}
    </div>
  );
}
