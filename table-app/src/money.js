/** Money helpers. All math happens in floating dollars, rounding only for display — matches the prototype. */

export const fmt = n => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

export const round2 = n => Math.round(n * 100) / 100;

const FRACTIONS = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕', 6: '⅙' };
export const fraction = n => FRACTIONS[n] || `1/${n}`;

/** Sum of unit × qty over a list of lines. */
export const sumLines = lines => lines.reduce((a, l) => a + l.unit * l.qty, 0);

/**
 * Bill totals for the whole table.
 * tip is computed on the pre-tax subtotal (spec).
 */
export function billTotals({ subtotal, taxRate, tipRate }) {
  const tax = subtotal * taxRate;
  const tip = subtotal * tipRate;
  return { subtotal, tax, tip, total: subtotal + tax + tip, preTip: subtotal + tax };
}

/**
 * Per-person shares when splitting "by items".
 * Each person's share = (their own non-shared items + shared items / headcount) × (1 + tax + tip).
 * `people` = [{ id, lines:[{unit, qty, shared}] }]
 */
export function sharesByItems(people, { taxRate, tipRate }) {
  const n = people.length;
  const mult = 1 + taxRate + tipRate;
  const sharedSum = people.flatMap(p => p.lines).filter(l => l.shared).reduce((a, l) => a + l.unit * l.qty, 0);
  const shares = {};
  for (const p of people) {
    const own = p.lines.filter(l => !l.shared).reduce((a, l) => a + l.unit * l.qty, 0);
    shares[p.id] = (own + sharedSum / n) * mult;
  }
  return { shares, sharedSum, n, mult };
}

/** Custom split: parse typed strings, report what's assigned and what's left. */
export function customSplit(custom, ids, total) {
  const amt = id => parseFloat(custom[id]) || 0;
  const assigned = ids.reduce((a, id) => a + amt(id), 0);
  const left = total - assigned;
  return { amt, assigned, left, balanced: Math.abs(left) < 0.005 };
}

/** Keypad edit rule from the spec: digits, one '.', max two decimals, ⌫ deletes last char. */
export function pressKey(value, key) {
  let v = value || '';
  if (key === '⌫') return v.slice(0, -1);
  if (key === '.') return v.includes('.') ? v : (v || '0') + '.';
  if (/\.\d\d$/.test(v)) return v; // block third decimal digit
  if (v === '0') v = '';
  if (v.replace('.', '').length >= 7) return v; // sanity cap
  return v + key;
}
