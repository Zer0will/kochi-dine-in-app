import { useEffect, useRef } from 'preact/hooks';
import { Avatar, Photo } from './ui.jsx';
import { ME, SAUCES } from './config.js';
import { fmt } from './money.js';

export function ItemSheet({ menu, s, d, act }) {
  const sh = s.sheet, info = d.sheet;
  const ref = useRef();
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') act.closeSheet(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);
  if (!sh || !info) return null;
  const it = info.item;

  return (
    <>
      <div class="dim" onClick={act.closeSheet} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={it.name} ref={ref}>
        <div class="handle"><span /></div>
        <div class="sheet-scroll sc">
          <div class="hero">
            <Photo src={it.photo} alt="" />
            <span class="kr">{it.korean || it.name}</span>
            {it.featured && <span class="badge">MOST ORDERED</span>}
          </div>
          <div class="title-row">
            <div class="name">{it.name}</div>
            <div class="price">{fmt(it.price)}</div>
          </div>
          {it.description && <div class="desc">{it.description}{it.sauces ? ' Pick your sauce below.' : ''}</div>}

          {it.sauces && (
            <div class="group" role="radiogroup" aria-label="Sauce">
              <div class="group-head"><span class="lbl">SAUCE</span><span class="req">REQUIRED · PICK 1</span></div>
              <div class="rows">
                {SAUCES.map((sa, i) => (
                  <button key={sa.id} class={`row${sh.sauce === i ? ' on' : ''}`} role="radio" aria-checked={sh.sauce === i} onClick={() => act.patchSheet({ sauce: i })}>
                    <span class="radio"><i /></span>
                    <span class="lbl">{sa.en}{sa.kr && <span class="kr">{sa.kr}</span>}</span>
                    {sa.spicy && <span class="spicy">SPICY</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div class="group">
            <div class="group-head"><span class="lbl">EXTRAS</span><span class="opt">OPTIONAL</span></div>
            <div class="rows">
              {menu.extras.map(ex => {
                const on = !!sh.extras[ex.id];
                return (
                  <button key={ex.id} class={`row${on ? ' checked' : ''}`} role="checkbox" aria-checked={on} onClick={() => act.patchSheet({ extras: { ...sh.extras, [ex.id]: !on } })}>
                    <span class="check">✓</span>
                    <span class="lbl ex">{ex.en}{ex.kr && <span class="kr">{ex.kr}</span>}</span>
                    <span class="amt">+{fmt(ex.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div class="group">
            <div class="group-head"><span class="lbl">NOTE FOR KITCHEN</span></div>
            <input class="note" value={sh.note} placeholder="Extra crispy please…" maxLength={140} onInput={e => act.patchSheet({ note: e.currentTarget.value })} />
          </div>

          <div class="identity">
            <Avatar {...ME} />
            <span>Ordering as <b>{ME.name}</b></span>
          </div>
        </div>

        <div class="sheet-bar">
          <div class="stepper">
            <button class="dec" onClick={() => act.patchSheet({ qty: Math.max(1, sh.qty - 1) })} aria-label="Fewer">−</button>
            <span>{sh.qty}</span>
            <button onClick={() => act.patchSheet({ qty: sh.qty + 1 })} aria-label="More">+</button>
          </div>
          <button class="btn-add" disabled={info.needSauce} onClick={act.addFromSheet}>
            <span>{info.needSauce ? 'Pick a sauce first' : 'Add to table cart'}</span>
            <span>{fmt(info.total)}</span>
          </button>
        </div>
      </div>
    </>
  );
}
