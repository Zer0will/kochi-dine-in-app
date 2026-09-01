import { useReducer, useEffect, useMemo, useCallback } from 'preact/hooks';
import { ME, SEED_GUESTS, SAUCES, TIPS, DEFAULT_TIP_INDEX, PAY_METHODS } from './config.js';
import { sumLines, billTotals, sharesByItems, customSplit, pressKey, fmt, fraction } from './money.js';

/* ---------- table identity ---------- */

export const tableId = decodeURIComponent(
  location.pathname.match(/\/table\/([^/?#]+)/)?.[1] ||
  new URLSearchParams(location.search).get('table') ||
  '7'
);
const params = new URLSearchParams(location.search);
/** `?seed=0` turns the demo guests off (single diner, one bill only). */
export const seeded = params.get('seed') !== '0';

const storageKey = `kochi_table_${tableId}_v2`;

/* ---------- state ---------- */

const emptyCustom = () => Object.fromEntries([ME, ...SEED_GUESTS].map(p => [p.id, '']));

export const initialState = {
  screen: 'menu',            // menu | cart | checkout | paid
  cat: 0,
  sheet: null,               // { itemId, sauce, extras:{id:bool}, qty, note }
  myLines: [],               // { key, itemId, name, korean, base, unit, qty, sauce, extras:[id], note, sent }
  roundsSent: 0,
  sending: false,
  sendNote: null,            // string shown in the green banner after a send
  payMode: 'one',            // one | split
  splitMode: 'items',        // items | even | custom
  tipIdx: DEFAULT_TIP_INDEX,
  payIdx: 0,
  custom: emptyCustom(),
  customSel: ME.id,
  paid: null,                // { amount, method }
  toast: null,               // transient add-to-cart microcopy (never persisted)
  toastSeq: 0                // bumps on every add so the toast/pulse animation replays
};

const PERSISTED = ['myLines', 'roundsSent', 'tipIdx', 'payIdx', 'screen', 'payMode', 'splitMode'];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) return initialState;
    const s = { ...initialState, ...saved, custom: emptyCustom(), sheet: null, sending: false, sendNote: null, toast: null, toastSeq: 0 };
    if (s.screen === 'paid') s.screen = 'menu';
    return s;
  } catch { return initialState; }
}
function persist(s) {
  try {
    const out = {};
    for (const k of PERSISTED) out[k] = s[k];
    localStorage.setItem(storageKey, JSON.stringify(out));
  } catch { /* private mode etc. — the session just won't survive a refresh */ }
}

function reducer(s, a) {
  switch (a.type) {
    case 'go': return { ...s, screen: a.screen, sheet: null };
    case 'cat': return { ...s, cat: a.cat };
    case 'openSheet': return { ...s, sheet: { itemId: a.itemId, sauce: null, extras: {}, qty: 1, note: '' } };
    case 'closeSheet': return { ...s, sheet: null };
    case 'sheet': return { ...s, sheet: { ...s.sheet, ...a.patch } };
    case 'addLine': {
      const line = a.line;
      const idx = s.myLines.findIndex(l => !l.sent && l.itemId === line.itemId && l.sauce === line.sauce && l.note === line.note && l.extras.join() === line.extras.join());
      const myLines = s.myLines.slice();
      if (idx >= 0) myLines[idx] = { ...myLines[idx], qty: myLines[idx].qty + line.qty };
      else myLines.push(line);
      return { ...s, myLines, sheet: null, toast: `Added · ${line.name}`, toastSeq: s.toastSeq + 1 };
    }
    case 'clearToast': return s.toast ? { ...s, toast: null } : s;
    case 'qty': {
      const myLines = s.myLines.slice();
      const i = myLines.findIndex(l => l.key === a.key);
      if (i < 0) return s;
      const q = myLines[i].qty + a.delta;
      if (q <= 0) myLines.splice(i, 1); else myLines[i] = { ...myLines[i], qty: q };
      return { ...s, myLines };
    }
    case 'sending': return { ...s, sending: true };
    case 'sent': return {
      ...s, sending: false, roundsSent: s.roundsSent + 1, sendNote: a.note,
      myLines: s.myLines.map(l => l.sent ? l : { ...l, sent: true, round: s.roundsSent + 1 })
    };
    case 'sendFailed': return { ...s, sending: false, sendNote: a.note };
    case 'payMode': return { ...s, payMode: a.mode };
    case 'splitMode': return { ...s, splitMode: a.mode };
    case 'tip': return { ...s, tipIdx: a.idx };
    case 'pay': return { ...s, payIdx: a.idx };
    case 'customSel': return { ...s, customSel: a.id };
    case 'custom': return { ...s, custom: { ...s.custom, ...a.patch } };
    case 'paid': return { ...s, screen: 'paid', paid: a.paid };
    case 'reset': return { ...initialState, custom: emptyCustom() };
    default: return s;
  }
}

/* ---------- hook ---------- */

export function useTableSession(menu) {
  const [s, dispatch] = useReducer(reducer, null, load);
  useEffect(() => { persist(s); }, [s]);

  // Auto-dismiss the add-to-cart toast a moment after it appears.
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => dispatch({ type: 'clearToast' }), 1600);
    return () => clearTimeout(t);
  }, [s.toastSeq]);

  const d = useMemo(() => derive(s, menu), [s, menu]);

  const act = useMemo(() => ({
    go: screen => dispatch({ type: 'go', screen }),
    setCat: cat => dispatch({ type: 'cat', cat }),
    openSheet: itemId => dispatch({ type: 'openSheet', itemId }),
    closeSheet: () => dispatch({ type: 'closeSheet' }),
    patchSheet: patch => dispatch({ type: 'sheet', patch }),
    qty: (key, delta) => dispatch({ type: 'qty', key, delta }),
    setPayMode: mode => dispatch({ type: 'payMode', mode }),
    setSplitMode: mode => dispatch({ type: 'splitMode', mode }),
    setTip: idx => dispatch({ type: 'tip', idx }),
    setPay: idx => dispatch({ type: 'pay', idx }),
    selectCustom: id => dispatch({ type: 'customSel', id }),
    reset: () => dispatch({ type: 'reset' })
  }), []);

  /* --- composite actions that need derived data --- */

  const addFromSheet = useCallback(() => {
    if (!d.sheet || d.sheet.needSauce) return;
    const sh = s.sheet, it = d.sheet.item;
    const extras = menu.extras.filter(e => sh.extras[e.id]).map(e => e.id);
    const bits = [];
    if (it.sauces && sh.sauce !== null) bits.push(SAUCES[sh.sauce].en);
    menu.extras.forEach(e => { if (sh.extras[e.id]) bits.push(e.en.toLowerCase()); });
    if (sh.note.trim()) bits.push(`"${sh.note.trim()}"`);
    dispatch({ type: 'addLine', line: {
      key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      itemId: it.id, name: it.name, korean: it.korean,
      base: it.price, unit: d.sheet.unit, qty: sh.qty,
      sauce: it.sauces ? SAUCES[sh.sauce].id : null,
      extras, note: sh.note.trim(),
      desc: bits.join(' · ') || it.korean || '',
      sent: false
    } });
  }, [s.sheet, d.sheet, menu]);

  const sendRound = useCallback(async () => {
    if (s.sending || !d.unsentLines.length) return;
    dispatch({ type: 'sending' });
    const round = s.roundsSent + 1;
    const payload = {
      tableId, round, guest: ME.name,
      lines: d.unsentLines.map(l => ({ name: l.name, korean: l.korean, qty: l.qty, unit: l.unit, sauce: l.sauce, extras: l.extras, note: l.note })),
      subtotal: Math.round(sumLines(d.unsentLines) * 100) / 100
    };
    try {
      const res = await fetch('/api/round', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      dispatch({ type: 'sent', note: `Round ${round} sent to kitchen — add more anytime` });
    } catch (err) {
      // Preview-friendly: the kitchen hook isn't wired yet, so still mark the round as sent locally.
      dispatch({ type: 'sent', note: `Round ${round} saved — kitchen link offline (${err.message})` });
    }
  }, [s.sending, s.roundsSent, d.unsentLines]);

  const cartCta = useCallback(() => {
    if (d.unsentLines.length) sendRound();
    else act.go('checkout');
  }, [d.unsentLines.length, sendRound, act]);

  const pressKeypad = useCallback(key => {
    dispatch({ type: 'custom', patch: { [s.customSel]: pressKey(s.custom[s.customSel], key) } });
  }, [s.customSel, s.custom]);

  const splitRemainder = useCallback(() => {
    if (d.custom.balanced) return;
    const per = d.custom.left / d.people.length;
    const patch = {};
    d.people.forEach(p => { patch[p.id] = (d.custom.amt(p.id) + per).toFixed(2); });
    dispatch({ type: 'custom', patch });
  }, [d]);

  const addRemainderToMine = useCallback(() => {
    if (d.custom.balanced) return;
    dispatch({ type: 'custom', patch: { [ME.id]: (d.custom.amt(ME.id) + d.custom.left).toFixed(2) } });
  }, [d]);

  const payNow = useCallback(() => {
    if (d.payBlocked) return;
    // Production: create a Stripe Checkout session / Apple Pay payment request here and only
    // move to the paid screen once the webhook confirms. This preview goes straight through.
    dispatch({ type: 'paid', paid: { amount: d.payAmt, method: d.method.name } });
  }, [d]);

  return { s, d, act: { ...act, addFromSheet, sendRound, cartCta, pressKeypad, splitRemainder, addRemainderToMine, payNow } };
}

/* ---------- derived values ---------- */

export function derive(s, menu) {
  const others = seeded ? SEED_GUESTS : [];
  const people = [ME, ...others];
  const n = people.length;

  const category = menu.categories[Math.min(s.cat, menu.categories.length - 1)];
  const taxRate = menu.taxRate;
  const tipRate = TIPS[s.tipIdx];

  const mySub = sumLines(s.myLines);
  const otherLines = others.flatMap(p => p.lines.map(l => ({ ...l, who: p.name })));
  const subtotal = mySub + sumLines(otherLines);
  const totals = billTotals({ subtotal, taxRate, tipRate });

  const myCount = s.myLines.reduce((a, l) => a + l.qty, 0);
  const cartCount = myCount + otherLines.reduce((a, l) => a + l.qty, 0);
  const unsentLines = s.myLines.filter(l => !l.sent);
  const ordering = (s.myLines.length ? 1 : 0) + others.filter(p => p.lines.length).length;

  /* sheet */
  let sheet = null;
  if (s.sheet) {
    const item = menu.categories.flatMap(c => c.items).find(i => i.id === s.sheet.itemId);
    if (item) {
      const extSum = menu.extras.reduce((a, e) => a + (s.sheet.extras[e.id] ? e.price : 0), 0);
      const unit = item.price + extSum;
      const needSauce = item.sauces && s.sheet.sauce === null;
      sheet = { item, unit, total: unit * s.sheet.qty, needSauce };
    }
  }

  /* split by items */
  const splitPeople = people.map(p => ({ id: p.id, lines: p.id === ME.id ? s.myLines : p.lines }));
  const byItems = sharesByItems(splitPeople, { taxRate, tipRate });
  const sharedLines = otherLines.filter(l => l.shared);
  const sharedLabel = sharedLines.length === 1 ? sharedLines[0].name : 'shared dishes';
  const sharedShort = sharedLines.length === 1 ? sharedLines[0].name.replace(/ Soup$/, ' soup').toLowerCase().split(' ').slice(-1)[0] : 'shared';
  const itemDetail = p => {
    const own = (p.id === ME.id ? s.myLines : p.lines).filter(l => !l.shared).map(l => l.name);
    const bits = own.slice();
    if (byItems.sharedSum) bits.push(`${fraction(n)} shared ${sharedShort}`);
    if (!bits.length) return 'No items yet';
    if (!own.length) return `${fraction(n)} shared ${sharedShort} only`;
    return bits.join(' + ');
  };
  const evenShare = totals.total / n;

  /* custom split */
  const custom = customSplit(s.custom, people.map(p => p.id), totals.total);

  /* pay */
  const modeOne = s.payMode === 'one' || !seeded;
  const myShare = s.splitMode === 'custom' ? custom.amt(ME.id) : s.splitMode === 'even' ? evenShare : byItems.shares[ME.id];
  const payAmt = modeOne ? totals.total : myShare;
  const customBlocked = !modeOne && s.splitMode === 'custom' && !custom.balanced;
  const method = PAY_METHODS[s.payIdx];
  const payBtnLabel = customBlocked
    ? `Lock shares — ${fmt(Math.abs(custom.left))}${custom.left >= 0 ? ' unassigned' : ' over'}`
    : method.id === 'counter' ? 'Pay at the counter' : `Pay ${fmt(payAmt)} with ${method.name}`;

  const billLines = [
    ...s.myLines.map(l => ({ label: l.name, sub: l.desc ? `· ${l.desc}` : '', amt: l.unit * l.qty })),
    ...otherLines.map(l => ({ label: l.name, sub: l.shared ? '· shared' : `· ${l.who}`, amt: l.unit * l.qty }))
  ];

  return {
    tableId, seeded, others, people, n, category, taxRate, tipRate,
    mySub, otherLines, subtotal, ...totals, myCount, cartCount, unsentLines, ordering,
    roundLabel: `round ${s.roundsSent + 1}`,
    sheet,
    byItems, sharedLabel, itemDetail, evenShare, custom,
    modeOne, payAmt, payBlocked: customBlocked, customBlocked, method, payBtnLabel, billLines
  };
}
