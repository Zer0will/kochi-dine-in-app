import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = (file) => fs.readFileSync(file, 'utf8');
const menu = JSON.parse(src('public/data/menu.json'));

// Browser globals needed by store.js module initialization.
globalThis.location = new URL('https://example.test/table/7');
globalThis.localStorage = {
  data: new Map(),
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; },
  setItem(k, v) { this.data.set(k, String(v)); },
  removeItem(k) { this.data.delete(k); },
  clear() { this.data.clear(); }
};

const { derive, initialState } = await import('../table-app/src/store.js');
const d0 = derive(initialState, menu);
assert.equal(d0.myCount, 0, 'fresh table starts with no guest-owned cart items');
assert.equal(d0.unsentLines.length, 0, 'fresh table has nothing to send');
assert.equal(d0.people.length, 0, 'fresh table starts with nobody on the check');
assert.equal(d0.currentGuest, null, 'fresh table has no identified current guest');

const store = src('table-app/src/store.js');
assert.match(store, /MAX_PEOPLE\s*=\s*10/, 'check must cap at 10 people');
assert.match(store, /identifyGuest|guestName|currentGuestId/, 'store must support naming/selecting the active guest');
assert.match(store, /needsIdentity/, 'adding an item should force identity before it enters the cart');

const menuScreen = src('table-app/src/MenuScreen.jsx');
assert.match(menuScreen, /d\.cartCount > 0/, 'floating cart bar is gated by actual table cart items');
assert.doesNotMatch(src('table-app/src/CartScreen.jsx'), /class="live"|LIVE<\/span>/, 'cart screen must not show LIVE badge/button');

const app = src('table-app/src/App.jsx');
assert.match(app, /function MenuSkeleton/, 'skeleton loading component exists');
assert.match(app, /aria-busy="true"/, 'skeleton announces busy state');

const css = src('table-app/src/styles.css');
for (const token of ['@keyframes slideup', '@keyframes slideInRight', '@keyframes popCount', '@keyframes shimmer', '.view.enter-pay', 'prefers-reduced-motion']) {
  assert.ok(css.includes(token), `missing motion CSS token: ${token}`);
}
assert.match(css, /translateY\(100%\)/, 'item sheet should slide from bottom');
assert.match(css, /\.view\.enter-right/, 'screen slide-right transition exists');
assert.match(css, /\.cartbar \.count/, 'cart count pulse animation exists');

console.log('ui regression checks ok');
