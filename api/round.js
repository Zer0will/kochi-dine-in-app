/**
 * POST /api/round — a table sends one round of dishes to the kitchen.
 *
 * Body: { tableId, round, guest, lines:[{ name, korean, qty, unit, sauce, extras, note }], subtotal }
 *
 * Preview mode: validates, normalises, logs, and returns a round id. Production wiring
 * (same options as api/order.js): kitchen tablet / KDS webhook, Twilio SMS, Resend email,
 * or a Supabase insert that also drives realtime cart sync between phones at the table.
 * Keep credentials in Vercel env vars only.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) return res.status(400).json({ error: 'Round is empty' });
  if (!body.tableId) return res.status(400).json({ error: 'tableId is required' });

  const clean = lines.slice(0, 60).map(l => ({
    name: String(l.name || '').slice(0, 160),
    korean: String(l.korean || '').slice(0, 160),
    qty: Math.max(1, Math.min(50, Math.round(Number(l.qty) || 1))),
    unit: Math.round((Number(l.unit) || 0) * 100) / 100,
    sauce: l.sauce ? String(l.sauce).slice(0, 40) : null,
    extras: Array.isArray(l.extras) ? l.extras.slice(0, 10).map(e => String(e).slice(0, 40)) : [],
    note: String(l.note || '').slice(0, 300)
  }));
  const subtotal = Math.round(clean.reduce((a, l) => a + l.unit * l.qty, 0) * 100) / 100;

  const roundId = `KPR-${Date.now().toString(36).toUpperCase()}`;
  const round = {
    roundId,
    receivedAt: new Date().toISOString(),
    tableId: String(body.tableId).slice(0, 20),
    round: Math.max(1, Math.round(Number(body.round) || 1)),
    guest: String(body.guest || 'Guest').slice(0, 60),
    lines: clean,
    subtotal,
    mode: 'preview_no_kitchen_notification'
  };

  console.log(JSON.stringify({ event: 'kochi_table_round', round }));
  return res.status(200).json({ ok: true, roundId, round });
}

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
