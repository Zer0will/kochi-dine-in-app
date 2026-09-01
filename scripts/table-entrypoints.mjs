import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public/table');
const index = path.join(root, 'index.html');
if (!fs.existsSync(index)) {
  throw new Error(`Missing built table app: ${index}`);
}
const html = fs.readFileSync(index, 'utf8');
for (let n = 1; n <= 100; n += 1) {
  const dir = path.join(root, String(n));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
console.log('table entrypoints ok: /table/1 … /table/100');
