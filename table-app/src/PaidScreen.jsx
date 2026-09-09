import { HAPPY_HOUR_LINE } from './config.js';
import { fmt } from './money.js';

export function PaidScreen({ s, d, act }) {
  const paid = s.paid || { amount: 0, method: 'Apple Pay' };
  return (
    <div class="view enter-pay">
      <div class="paid">
        <div class="stamp"><div>미리<br />보기</div></div>
        <h1>PREVIEW COMPLETE.<br />TABLE {d.tableId}</h1>
        <div class="sum">{fmt(paid.amount)} · {paid.method} · No payment was taken and no receipt was sent.</div>
        <div class="comeback">
          <div class="kr">또 오세요 — come back soon</div>
          <small>{HAPPY_HOUR_LINE}</small>
        </div>
      </div>
      <div class="paid-actions">
        <button class="ghost" onClick={() => window.print()}>Print preview</button>
        <button class="done" onClick={act.reset}>Done</button>
      </div>
    </div>
  );
}
