import { Avatar, TopBar } from './ui.jsx';
import { TIPS, PAY_METHODS } from './config.js';
import { fmt, fraction } from './money.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function CheckoutScreen({ s, d, act }) {
  const pct = Math.round(d.taxRate * 10000) / 100;
  const split = !d.modeOne;

  return (
    <div class="view enter-right">
      <TopBar onBack={() => act.go('cart')} title="CLOSE OUT" sub={`Table ${d.tableId} · all rounds sent`}
        right={<span class="hand">잘 먹었습니다</span>} />

      <div class="co-scroll sc">
        {d.people.length > 1 && (
          <div class="seg" role="tablist">
            <button class={d.modeOne ? 'on' : ''} role="tab" aria-selected={d.modeOne} onClick={() => act.setPayMode('one')}>One bill</button>
            <button class={split ? 'on' : ''} role="tab" aria-selected={split} onClick={() => act.setPayMode('split')}>Split by person</button>
          </div>
        )}

        {d.modeOne && <OneBill s={s} d={d} act={act} pct={pct} />}
        {split && <Split s={s} d={d} act={act} />}
      </div>

      <div class="bottombar">
        <div class="pay-label">
          <span>{d.modeOne ? 'Total with tip' : 'Your share · incl. tax & tip'}</span>
          <b>{fmt(d.payAmt)}</b>
        </div>
        <button class="btn-pay" disabled={d.payBlocked} onClick={act.payNow}>{d.payBtnLabel}</button>
        <div class="foot-note">{d.modeOne ? 'Paying direct — no marketplace fees, all of it goes to Kochi' : 'Table closes when all shares are paid'}</div>
      </div>
    </div>
  );
}

function OneBill({ s, d, act, pct }) {
  return (
    <>
      <div class="receipt">
        <div class="tag">BILL · TABLE {d.tableId}</div>
        <div class="lines-list">
          {d.billLines.map((b, i) => (
            <div class="bl" key={i}><span>{b.label} <i>{b.sub}</i></span><b>{fmt(b.amt)}</b></div>
          ))}
          {!d.billLines.length && <div class="bl"><span><i>Nothing ordered yet</i></span></div>}
        </div>
        <div class="tot">
          <div class="sumrow"><span>Subtotal</span><b>{fmt(d.subtotal)}</b></div>
          <div class="sumrow"><span>Tax ({pct}%)</span><b>{fmt(d.tax)}</b></div>
        </div>
      </div>

      <div class="group">
        <div class="group-head"><span class="lbl">TIP THE KITCHEN</span><span class="hand" style="font-size:19px">감사합니다!</span></div>
        <div class="tips">
          {TIPS.map((r, i) => (
            <button key={r} class={`tip${i === s.tipIdx ? ' on' : ''}`} onClick={() => act.setTip(i)} aria-pressed={i === s.tipIdx}>
              {Math.round(r * 100)}%<small>{fmt(d.subtotal * r)}</small>
            </button>
          ))}
        </div>
      </div>

      <div class="group">
        <div class="group-head"><span class="lbl">PAY WITH</span></div>
        <div class="rows" role="radiogroup">
          {PAY_METHODS.map((m, i) => (
            <button key={m.id} class={`row pay-row${i === s.payIdx ? ' on' : ''}`} role="radio" aria-checked={i === s.payIdx} onClick={() => act.setPay(i)}>
              <span class="radio"><i /></span>
              <span class="lbl">{m.name}</span>
              <span class="detail">{m.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Split({ s, d, act }) {
  const mode = s.splitMode;
  return (
    <>
      <div class="chips" role="tablist">
        {[['items', 'By items'], ['even', 'Evenly'], ['custom', 'Custom']].map(([k, label]) => (
          <button key={k} class={`chip${mode === k ? ' on' : ''}`} role="tab" aria-selected={mode === k} onClick={() => act.setSplitMode(k)}>{label}</button>
        ))}
      </div>

      {mode !== 'custom' && (
        <>
          {mode === 'items' && d.byItems.sharedSum > 0 && (
            <div class="shared-note">
              <span class="kr">{d.otherLines.find(l => l.shared)?.korean || '공유'}</span>
              <span>{d.sharedLabel} was shared — split {d.n} ways, {fmt(d.byItems.sharedSum / d.n)} each. Tax &amp; tip split with each share.</span>
            </div>
          )}
          <div class="shares">
            {d.people.map(p => {
              const me = p.id === d.currentGuestId;
              const amt = mode === 'even' ? d.evenShare : d.byItems.shares[p.id];
              return (
                <div class={`share${me ? ' me' : ''}`} key={p.id}>
                  <div class="head">
                    <Avatar {...p} size={28} />
                    <span class="name">{p.name} {me && <span>· you</span>}</span>
                    <span class="sp" />
                    <span class={`badge${me ? ' now' : ''}`}>{me ? 'PAYING NOW' : 'WAITING'}</span>
                  </div>
                  <div class="foot">
                    <span class="detail">{mode === 'even' ? `Even ${WORDS[d.n] || d.n}-way split incl. tax & tip` : d.itemDetail(p)}</span>
                    <span class="amt">{fmt(amt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mode === 'custom' && (
        <>
          <div class="custom-rows">
            {d.people.map(p => {
              const sel = s.customSel === p.id;
              return (
                <button key={p.id} class={`crow${sel ? ' sel' : ''}`} onClick={() => act.selectCustom(p.id)} aria-pressed={sel}>
                  <Avatar {...p} size={30} />
                  <span class="t"><b>{p.name} {p.id === d.currentGuestId && <span>· you</span>}</b><small>{sel ? 'typing…' : ' '}</small></span>
                  <span class="amt">${s.custom[p.id] === '' ? '0' : s.custom[p.id]}</span>
                </button>
              );
            })}
          </div>
          <div class={`tracker${d.custom.balanced ? ' ok' : ''}`} aria-live="polite">
            <span class="a">{fmt(d.custom.assigned)} of {fmt(d.total)} assigned</span>
            <span class="l">{d.custom.balanced ? '✓ balanced' : d.custom.left >= 0 ? `${fmt(d.custom.left)} left` : `${fmt(-d.custom.left)} over`}</span>
          </div>
          <div class="quick">
            <button onClick={act.splitRemainder}>Split remainder</button>
            <button onClick={act.addRemainderToMine}>Add to mine</button>
          </div>
          <div class="keypad">
            <div class="keys">
              {KEYS.map(k => <button key={k} onClick={() => act.pressKeypad(k)} aria-label={k === '⌫' ? 'Delete' : k}>{k}</button>)}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
