// Dev/QA helper: serves ./public like Vercel would, walks the whole dine-in flow in headless
// Chromium at 390×844 and saves screenshots to ./shots. Run: node scripts/shoot.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PUBLIC = path.resolve('public');
const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/round' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, roundId: 'TEST-1' })); });
    return;
  }
  let file = path.join(PUBLIC, url);
  if (url.startsWith('/table/') && !fs.existsSync(file)) file = path.join(PUBLIC, 'table/index.html');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[ext] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } else { res.statusCode = 404; res.end('nope'); }
}).listen(4173);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('shot', name); };
const text = async sel => (await page.locator(sel).first().textContent())?.trim();

await page.goto('http://localhost:4173/table/7');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.card');
await page.waitForTimeout(800); // fonts
await shot('01-menu-grilled');

await page.getByRole('button', { name: /CHICKEN/ }).click();
await shot('02-menu-chicken');
await page.getByRole('button', { name: /APPETIZERS/ }).click();
await shot('03-menu-appetizers');

// Corn Cheese → sheet
await page.locator('.card', { hasText: 'Corn Cheese' }).click();
await page.waitForSelector('.sheet');
await shot('04-sheet-corn-cheese');
await page.locator('.btn-add').click();
await page.waitForSelector('.cartbar');
await shot('05-menu-with-cartbar');
console.log('cartbar total:', await text('.cartbar .total'), '| expected $60.97');

// Table cart
await page.locator('.cartbar').click();
await page.waitForSelector('.cart-scroll');
await shot('06-cart');
console.log('cart subtotal/tax/total:', await text('.sumrow:nth-child(1) b'), await text('.sumrow:nth-child(2) b'), await text('.totalrow b'), '| expected $60.97 $6.25 $67.22');

// Send round
await page.locator('.btn-primary').click();
await page.waitForSelector('.sent-banner');
await shot('07-cart-sent');
console.log('cta after send:', await text('.btn-primary'));

// Checkout: one bill
await page.locator('.btn-primary').click();
await page.waitForSelector('.receipt');
await shot('08-checkout-one-bill');
console.log('one bill total:', await text('.pay-label b'), '| expected $79.41  btn:', await text('.btn-pay'));

// Split by items
await page.getByRole('tab', { name: 'Split by person' }).click();
await page.waitForSelector('.shares');
await shot('09-split-by-items');
const amts = await page.locator('.share .amt').allTextContents();
console.log('by items:', amts.join(' '), '| expected $24.30 $43.83 $11.28');

await page.getByRole('tab', { name: 'Evenly' }).click();
await shot('10-split-evenly');
console.log('evenly:', (await page.locator('.share .amt').allTextContents()).join(' '), '| expected $26.47 ×3');

await page.getByRole('tab', { name: 'Custom' }).click();
await page.waitForSelector('.keypad');
await shot('11-split-custom-empty');
console.log('custom btn:', await text('.btn-pay'));
for (const k of ['3', '0', '.', '0', '0', '5']) await page.getByRole('button', { name: k === '⌫' ? 'Delete' : k, exact: true }).click();
console.log('after typing 30.005 → Jae shows', await text('.crow.sel .amt'), '(third decimal should be blocked)');
await page.locator('.crow', { hasText: 'Soo' }).click();
for (const k of ['4', '5']) await page.getByRole('button', { name: k, exact: true }).click();
await shot('12-split-custom-typing');
console.log('tracker:', await text('.tracker .a'), await text('.tracker .l'));
await page.getByRole('button', { name: 'Split remainder' }).click();
console.log('after split remainder:', (await page.locator('.crow .amt').allTextContents()).join(' '), await text('.tracker .l'));
await shot('13-split-custom-balanced');
console.log('custom pay btn:', await text('.btn-pay'));

// Pay from one bill so the paid amount is the $79.41 case
await page.getByRole('tab', { name: 'One bill' }).click();
await page.locator('.btn-pay').click();
await page.waitForSelector('.stamp');
await shot('14-paid');
console.log('paid summary:', await text('.paid .sum'));

// Done resets
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForSelector('.card');
console.log('after Done, cartbar visible?', await page.locator('.cartbar').count() > 0, '(seeded guests keep the bar; my lines should be gone)');

// solo mode + fried chicken sauce gating
await page.goto('http://localhost:4173/table/12?seed=0');
await page.waitForSelector('.card');
await page.getByRole('button', { name: /CHICKEN/ }).click();
await page.locator('.card', { hasText: 'Fried Chicken' }).first().click();
await page.waitForSelector('.sheet');
console.log('sauce gate label:', await text('.btn-add'), '| disabled:', await page.locator('.btn-add').isDisabled());
await shot('15-sheet-fried-chicken-nosauce');
await page.locator('.row', { hasText: 'Honey Garlic' }).click();
await page.locator('.row', { hasText: 'Extra Sauce' }).click();
await page.locator('.note').fill('Extra crispy please');
await page.locator('.stepper button').last().click();
console.log('sheet total (30.99+1.99)×2:', await text('.btn-add span:last-child'), '| expected $65.96');
await shot('16-sheet-fried-chicken-ready');
await page.locator('.btn-add').click();
await page.locator('.cartbar').click();
await shot('17-solo-cart');
console.log('solo line desc:', await text('.line .t small'));

// desktop frame
await page.setViewportSize({ width: 1100, height: 900 });
await page.goto('http://localhost:4173/table/7');
await page.waitForSelector('.card');
await page.waitForTimeout(500);
await shot('18-desktop-frame');

await browser.close();
server.close();
