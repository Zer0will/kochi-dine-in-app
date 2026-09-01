import { ME, HAPPY_HOUR_LINE } from './config.js';
import { fmt } from './money.js';

export function PaidScreen({ s, d, act }) {
  const paid = s.paid || { amount: 0, method: 'Apple Pay' };
  return (
    <div class="view">
      <div class="paid">
        <div class="stamp"><div>계산<br />완료</div></div>
        <h1>ALL PAID.<br />GOODNIGHT, TABLE {d.tableId}</h1>
        <div class="sum">{fmt(paid.amount)} · {paid.method} · receipt texted to {ME.name}.</div>
        <div class="comeback">
          <div class="kr">또 오세요 — come back soon</div>
          <small>{HAPPY_HOUR_LINE}</small>
        </div>
      </div>
      <div class="paid-actions">
        <button class="ghost" onClick={() => window.print()}>View receipt</button>
        <button class="done" onClick={act.reset}>Done</button>
      </div>
    </div>
  );
}
