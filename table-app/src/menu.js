import { CATEGORY_RAIL, HIDDEN_CATEGORIES, KR_FALLBACK, SHEET_EXTRAS, TAX_FALLBACK } from './config.js';

const slug = s => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Load /data/menu.json and shape it for the app.
 * Returns { business, taxRate, categories:[{key,kr,en,sub,sauces,items:[...]}], extras:[...] }
 */
export async function loadMenu() {
  const res = await fetch('/data/menu.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Menu failed to load');
  return shapeMenu(await res.json());
}

export function shapeMenu(raw) {
  const byName = new Map(raw.categories.map(c => [c.name, c]));
  const known = new Set(CATEGORY_RAIL.map(c => c.key));

  const railed = CATEGORY_RAIL
    .filter(c => byName.has(c.key))
    .map(c => toCategory(c, byName.get(c.key)));

  // Any category in the JSON we don't have a rail entry for still shows up (generic label) unless hidden.
  const leftovers = raw.categories
    .filter(c => !known.has(c.name) && !HIDDEN_CATEGORIES.includes(c.name))
    .map(c => toCategory({ key: c.name, kr: c.korean || c.name.slice(0, 2), en: c.name.toUpperCase(), sub: c.korean || '' }, c));

  const categories = [...railed, ...leftovers].filter(c => c.items.length);

  // Extras on the item sheet take their live price from the Extras category if it exists.
  const extrasCat = byName.get('Extras');
  const extras = SHEET_EXTRAS.map(e => {
    const live = extrasCat?.items.find(i => i.name === e.en);
    return { ...e, price: live ? Number(live.price) : e.price, kr: live?.korean || e.kr };
  });

  return {
    business: raw.business,
    taxRate: Number(raw.business?.taxRate) || TAX_FALLBACK,
    categories,
    extras
  };
}

function toCategory(cfg, cat) {
  return {
    key: cfg.key,
    kr: cfg.kr,
    en: cfg.en,
    sub: cfg.sub,
    sauces: !!cfg.sauces,
    items: (cat.items || [])
      .filter(i => Number(i.price) > 0)
      .map(i => ({
        id: slug(`${cfg.key}-${i.name}`),
        name: i.name,
        korean: i.korean || KR_FALLBACK[i.name] || '',
        price: Number(i.price),
        description: i.description || '',
        badge: i.badge || '',
        featured: !!i.featured,
        sauces: !!cfg.sauces
      }))
  };
}
