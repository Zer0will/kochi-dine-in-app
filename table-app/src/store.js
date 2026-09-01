import { useReducer, useEffect, useMemo, useCallback } from 'preact/hooks';
import { SAUCES, TIPS, DEFAULT_TIP_INDEX, PAY_METHODS } from './config.js';
import { sumLines, billTotals, sharesByItems, customSplit, pressKey, fmt, fraction } from './money.js';

/* ---------- table identity ---------- */

export const tableId = decodeURIComponent(
  location.pathname.match(/\/table\/([^/?#]+)/)?.[1] ||
  new URLSearchParams(location.search).get('table') ||
  '7'
);
const params = new URLSearchParams(location.search);
export const seeded = params.get('seed') !== '0';
export const MAX_PEOPLE = 10;

const storageKey = `kochi_table_${tableId}_v3`;
const palette = ['#ff594f', '#ffbd62', '#62d88f', '#73b7ff', '#c98bff', '#ff8ec7', '#87e7d1', '#f6e27f', '#ff8b6e', '#a5ff73'];
const textColor = i => [1, 2, 3, 6, 7, 9].includes(i % palette.length) ? '#23120d' : '#fff';
const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
const makeGuest = (name, idx = 0) => ({
  id: `G${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  name: (name || '').trim().slice(0, 28) || `Guest ${idx + 1}`,
  color: palette[idx % palette.length],
  tc: textColor(idx),
  lines: []
});

/* ---------- state ---------- */

const emptyCustom = (people = []) => Object.fromEntries(people.map(p => [p.id, '']));

export const initialState = {
  screen: 'menu',            // menu | cart | checkout | paid
  cat: 0,
  sheet: null,               // { itemId, sauce, extras:{id:bool}, qty, note }
  myLines: [],               // { key, guestId, itemId, name, korean, base, unit, qty, sauce, extras:[id], note, sent }
  people: [],                // guests currently on this check, max 10
  currentGuestId: null,      // person this phone/user is ordering as
  identityOpen: false,       // force name/select modal before first add
  pendingAdd: false,         // true when identity modal was opened by Add to cart
  roundsSent: 0,
  sending: false,
  sendNote: null,
  payMode: 'one',            // one | split
  splitMode: 'items',        // items | even | custom
  tipIdx: DEFAULT_TIP_INDEX,
  payIdx: 0,
  custom: {},
  customSel: null,
  paid: null,
  toast: null,
  toastSeq: 0
};

const PERSISTED = ['myLines', 'people', 'currentGuestId', 'roundsSent', 'tipIdx', 'payIdx', 'screen', 'payMode', 'splitMode'];

function hydrate(raw) {
  const people = Array.isArray(raw.people) ? raw.people.slice(0, MAX_PEOPLE).map((p, i) => ({
    id: p.id || `G${i + 1}`,
    name: (p.name || `Guest ${i + 1}`).slice(0, 28),
    color: p.color || palette[i % palette.length],
    tc: p.tc || textColor(i),
    lines: []
  })) : [];
  const ids = new Set(people.map(p => p.id));
  const currentGuestId = ids.has(raw.currentGuestId) ? raw.currentGuestId : null;
  const myLines = Array.isArray(raw.myLines) ? raw.myLines.filter(l => ids.has(l.guestId)).map(l => ({ ...l, extras: Array.isArray(l.extras) ? l.extras : [] })) : [];
  return { ...initialState, ...raw, people, currentGuestId, custom: emptyCustom(people), customSel: currentGuestId || people[0]?.id || null, myLines, sheet: null, sending: false, sendNote: null, toast: null, toastSeq: 0, identityOpen: false, pendingAdd: false };
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) return initialState;
    const s = hydrate(saved);
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
    case 'go': return { ...s, screen: a.screen, sheet: null, identityOpen: false, pendingAdd: false };
    case 'cat': return { ...s, cat: a.cat };
    case 'openSheet': return { ...s, sheet: { itemId: a.itemId, sauce: null, extras: {}, qty: 1, note: '' } };
    case 'closeSheet': return { ...s, sheet: null };
    case 'sheet': return { ...s, sheet: { ...s.sheet, ...a.patch } };
    case 'identityOpen': return { ...s, identityOpen: true, pendingAdd: !!a.pendingAdd };
    case 'identityClose': return { ...s, identityOpen: false, pendingAdd: false };
    case 'identifyGuest': {
      const requested = (a.name || '').trim();
      if (!requested && !a.id) return s;
      const existing = a.id ? s.people.find(p => p.id === a.id) : null;
      if (existing) return { ...s, currentGuestId: existing.id, customSel: existing.id, identityOpen: false, pendingAdd: false, toast: `Ordering as ${existing.name}`, toastSeq: s.toastSeq + 1 };
      if (s.people.length >= MAX_PEOPLE) return { ...s, identityOpen: false, pendingAdd: false, toast: `Maximum ${MAX_PEOPLE} people per check`, toastSeq: s.toastSeq + 1 };
      const guest = a.guest || makeGuest(requested, s.people.length);
      return { ...s, people: [...s.people, guest], currentGuestId: guest.id, customSel: guest.id, custom: { ...s.custom, [guest.id]: '' }, identityOpen: false, pendingAdd: false, toast: `Ordering as ${guest.name}`, toastSeq: s.toastSeq + 1 };
    }
    case 'addLine': {
      const line = a.line;
      if (!line.guestId) return { ...s, identityOpen: true, pendingAdd: true };
      const idx = s.myLines.findIndex(l => !l.sent && l.guestId === line.guestId && l.itemId === line.itemId && l.sauce === line.sauce && l.note === line.note && l.extras.join() === line.extras.join());
      const myLines = s.myLines.slice();
      if (idx >= 0) myLines[idx] = { ...myLines[idx], qty: myLines[idx].qty + line.qty };
      else myLines.push(line);
      const who = s.people.find(p => p.id === line.guestId)?.name || 'Guest';
      return { ...s, myLines, sheet: null, toast: `Added for ${who} · ${line.name}`, toastSeq: s.toastSeq + 1 };
    }
    case 'clearToast': return s.toast ? { ...s, toast: null } : s;
    case 'qty': {
      const myLines = s.myLines.slice();
      const i = myLines.findIndex(l => l.key === a.key);
      if (i < 0 || myLines[i].sent) return s;
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

function buildLine({ s, d, menu, guestId }) {
  if (!d.sheet || d.sheet.needSauce) return null;
  const sh = s.sheet, it = d.sheet.item;
  const extras = menu.extras.filter(e => sh.extras[e.id]).map(e => e.id);
  const bits = [];
  if (it.sauces && sh.sauce !== null) bits.push(SAUCES[sh.sauce].en);
  menu.extras.forEach(e => { if (sh.extras[e.id]) bits.push(e.en.toLowerCase()); });
  if (sh.note.trim()) bits.push(`"${sh.note.trim()}"`);
  return {
    key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    guestId,
    itemId: it.id, name: it.name, korean: it.korean,
    base: it.price, unit: d.sheet.unit, qty: sh.qty,
    sauce: it.sauces ? SAUCES[sh.sauce].id : null,
    extras, note: sh.note.trim(),
    desc: bits.join(' · ') || it.korean || '',
    sent: false
  };
}

/* ---------- hook ---------- */

export function useTableSession(menu) {
  const [s, dispatch] = useReducer(reducer, null, load);
  useEffect(() => { persist(s); }, [s]);

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
    openIdentity: pendingAdd => dispatch({ type: 'identityOpen', pendingAdd }),
    closeIdentity: () => dispatch({ type: 'identityClose' }),
    selectGuest: id => dispatch({ type: 'identifyGuest', id }),
    reset: () => dispatch({ type: 'reset' })
  }), []);

  const addFromSheet = useCallback(() => {
    if (!d.sheet || d.sheet.needSauce) return;
    if (!s.currentGuestId) {
      dispatch({ type: 'identityOpen', pendingAdd: true });
      return;
    }
    const line = buildLine({ s, d, menu, guestId: s.currentGuestId });
    if (line) dispatch({ type: 'addLine', line });
  }, [s, d, menu]);

  const identifyGuest = useCallback((name, id = null) => {
    const beforeId = id || null;
    if (beforeId) {
      dispatch({ type: 'identifyGuest', id: beforeId });
      return;
    }
    const clean = (name || '').trim();
    if (!clean || (!s.people.some(p => p.name.toLowerCase() === clean.toLowerCase()) && s.people.length >= MAX_PEOPLE)) {
      dispatch({ type: 'identifyGuest', name: clean });
      return;
    }
    const existing = s.people.find(p => p.name.toLowerCase() === clean.toLowerCase());
    const guest = existing || makeGuest(clean, s.people.length);
    dispatch(existing ? { type: 'identifyGuest', id: existing.id } : { type: 'identifyGuest', name: clean, guest });
    if (s.pendingAdd && s.sheet && d.sheet && !d.sheet.needSauce) {
      const line = buildLine({ s, d, menu, guestId: guest.id });
      setTimeout(() => dispatch({ type: 'addLine', line }), 0);
    }
  }, [s, d, menu]);

  const sendRound = useCallback(async () => {
    if (s.sending || !d.unsentLines.length) return;
    dispatch({ type: 'sending' });
    const round = s.roundsSent + 1;
    const payload = {
      tableId, round, guest: d.currentGuest?.name || 'Table',
      lines: d.unsentLines.map(l => ({ guest: d.people.find(p => p.id === l.guestId)?.name || 'Guest', name: l.name, korean: l.korean, qty: l.qty, unit: l.unit, sauce: l.sauce, extras: l.extras, note: l.note })),
      subtotal: Math.round(sumLines(d.unsentLines) * 100) / 100
    };
    try {
      const res = await fetch('/api/round', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      dispatch({ type: 'sent', note: `Round ${round} sent to kitchen — add more anytime` });
    } catch (err) {
      dispatch({ type: 'sent', note: `Round ${round} saved — kitchen link offline (${err.message})` });
    }
  }, [s.sending, s.roundsSent, d.unsentLines, d.currentGuest, d.people]);

  const cartCta = useCallback(() => {
    if (d.unsentLines.length) sendRound();
    else act.go('checkout');
  }, [d.unsentLines.length, sendRound, act]);

  const pressKeypad = useCallback(key => {
    if (!s.customSel) return;
    dispatch({ type: 'custom', patch: { [s.customSel]: pressKey(s.custom[s.customSel] || '', key) } });
  }, [s.customSel, s.custom]);

  const splitRemainder = useCallback(() => {
    if (d.custom.balanced || !d.people.length) return;
    const per = d.custom.left / d.people.length;
    const patch = {};
    d.people.forEach(p => { patch[p.id] = (d.custom.amt(p.id) + per).toFixed(2); });
    dispatch({ type: 'custom', patch });
  }, [d]);

  const addRemainderToMine = useCallback(() => {
    if (d.custom.balanced || !d.currentGuest) return;
    dispatch({ type: 'custom', patch: { [d.currentGuest.id]: (d.custom.amt(d.currentGuest.id) + d.custom.left).toFixed(2) } });
  }, [d]);

  const payNow = useCallback(() => {
    if (d.payBlocked) return;
    dispatch({ type: 'paid', paid: { amount: d.payAmt, method: d.method.name } });
  }, [d]);

  return { s, d, act: { ...act, addFromSheet, identifyGuest, sendRound, cartCta, pressKeypad, splitRemainder, addRemainderToMine, payNow } };
}

/* ---------- derived values ---------- */

export function derive(s, menu) {
  const people = Array.isArray(s.people) ? s.people.slice(0, MAX_PEOPLE).map((p, i) => ({ ...p, id: p.id, name: p.name || `Guest ${i + 1}`, label: initials(p.name), lines: s.myLines.filter(l => l.guestId === p.id) })) : [];
  const n = Math.max(people.length, 1);
  const currentGuest = people.find(p => p.id === s.currentGuestId) || null;

  const category = menu.categories[Math.min(s.cat, menu.categories.length - 1)];
  const taxRate = menu.taxRate;
  const tipRate = TIPS[s.tipIdx];

  const subtotal = sumLines(s.myLines);
  const totals = billTotals({ subtotal, taxRate, tipRate });

  const myLines = currentGuest ? s.myLines.filter(l => l.guestId === currentGuest.id) : [];
  const mySub = sumLines(myLines);
  const myCount = myLines.reduce((a, l) => a + l.qty, 0);
  const cartCount = s.myLines.reduce((a, l) => a + l.qty, 0);
  const unsentLines = s.myLines.filter(l => !l.sent);
  const ordering = people.filter(p => s.myLines.some(l => l.guestId === p.id)).length;

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

  const splitPeople = people.map(p => ({ id: p.id, lines: s.myLines.filter(l => l.guestId === p.id) }));
  const byItems = sharesByItems(splitPeople, { taxRate, tipRate });
  const sharedLines = [];
  const sharedLabel = 'shared dishes';
  const sharedShort = 'shared';
  const itemDetail = p => {
    const own = s.myLines.filter(l => l.guestId === p.id && !l.shared).map(l => l.name);
    if (!own.length) return 'No items yet';
    return own.join(' + ');
  };
  const evenShare = people.length ? totals.total / people.length : 0;

  const custom = customSplit(s.custom || {}, people.map(p => p.id), totals.total);

  const canSplit = people.length > 1;
  const modeOne = s.payMode === 'one' || !canSplit;
  const myShare = !currentGuest ? 0 : s.splitMode === 'custom' ? custom.amt(currentGuest.id) : s.splitMode === 'even' ? evenShare : byItems.shares[currentGuest.id];
  const payAmt = modeOne ? totals.total : myShare;
  const customBlocked = !modeOne && s.splitMode === 'custom' && !custom.balanced;
  const method = PAY_METHODS[s.payIdx];
  const payBtnLabel = customBlocked
    ? `Lock shares — ${fmt(Math.abs(custom.left))}${custom.left >= 0 ? ' unassigned' : ' over'}`
    : method.id === 'counter' ? 'Pay at the counter' : `Pay ${fmt(payAmt)} with ${method.name}`;

  const billLines = s.myLines.map(l => ({
    label: l.name,
    sub: `${people.find(p => p.id === l.guestId)?.name || 'Guest'}${l.desc ? ` · ${l.desc}` : ''}`,
    amt: l.unit * l.qty
  }));

  return {
    tableId, seeded, others: [], people, currentGuest, currentGuestId: s.currentGuestId, maxPeople: MAX_PEOPLE,
    canAddPeople: people.length < MAX_PEOPLE, needsIdentity: !currentGuest,
    n, category, taxRate, tipRate,
    mySub, myLines, otherLines: [], subtotal, ...totals, myCount, cartCount, unsentLines, ordering,
    roundLabel: `round ${s.roundsSent + 1}`,
    sheet,
    byItems, sharedLabel, sharedShort, itemDetail, evenShare, custom,
    modeOne, payAmt, payBlocked: customBlocked || !cartCount, customBlocked, method, payBtnLabel, billLines
  };
}
