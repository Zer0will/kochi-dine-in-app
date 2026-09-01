import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.join(REPO, 'public');

/**
 * Dev-only helper so `npm run dev` behaves like the deployed Vercel site:
 *  - serves the static files in /public (the menu JSON lives at /data/menu.json)
 *  - mocks the serverless /api/round endpoint (no `vercel dev` needed for UI work)
 */
function kochiDevServer() {
  return {
    name: 'kochi-dev-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];

        if (url === '/api/round' && req.method === 'POST') {
          let body = '';
          req.on('data', c => (body += c));
          req.on('end', () => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, roundId: `DEV-${Date.now().toString(36).toUpperCase()}`, echo: JSON.parse(body || '{}') }));
          });
          return;
        }

        if (url.startsWith('/data/')) {
          const file = path.join(PUBLIC, url);
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'application/json');
            fs.createReadStream(file).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  // The dine-in app lives in table-app/ and is served from /table/... on Vercel.
  root: 'table-app',
  base: '/table/',
  plugins: [preact(), kochiDevServer()],
  publicDir: false,
  build: {
    outDir: '../public/table',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 5173,
    open: '/table/7'
  }
});
