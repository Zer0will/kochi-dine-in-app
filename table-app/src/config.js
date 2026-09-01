/**
 * Presentation config for the dine-in app.
 * Menu items, prices and tax rate come from /data/menu.json (source of truth) —
 * this file only decides how those categories are labelled and ordered on the rail.
 */

export const TAX_FALLBACK = 0.1025;
export const TIPS = [0.15, 0.2, 0.25];
export const DEFAULT_TIP_INDEX = 1; // 20%

/** Category rail: order + hangul glyph + English label + handwritten subtitle. */
export const CATEGORY_RAIL = [
  { key: 'Grilled',       kr: '구이', en: 'GRILLED',    sub: '불에 구운 것' },
  { key: 'Chicken',       kr: '치킨', en: 'CHICKEN',    sub: '치킨', sauces: true },
  { key: 'Appetizers',    kr: '안주', en: 'APPETIZERS', sub: '안주' },
  { key: 'Entrees',       kr: '식사', en: 'ENTREES',    sub: '식사' },
  { key: 'Soup',          kr: '탕',   en: 'SOUP',       sub: '탕 · 찌개' },
  { key: 'Beverage',      kr: '음료', en: 'DRINKS',     sub: '음료수' },
  { key: 'Extras',        kr: '추가', en: 'EXTRAS',     sub: '추가' },
  { key: 'Special Combo', kr: '콤보', en: 'COMBO',      sub: '치맥' },
  { key: 'Happy Hour',    kr: '해피', en: 'HAPPY HOUR', sub: '해피아워' }
];

/** Categories in menu.json that should not be orderable from the table (e.g. $0 placeholder rows). */
export const HIDDEN_CATEGORIES = ['Dessert'];

/** Hangul for items whose menu.json entry has no `korean` yet. Keyed by English name. */
export const KR_FALLBACK = {
  'Shrimp Tempura': '새우튀김',
  'Crispy Honey Shrimp': '허니새우',
  'Kochi Fried Platter': '모둠튀김',
  'Half Whole Chicken': '반마리',
  'Seafood Stir-Fry Udon': '해물우동',
  'Creamy Rose Seafood Udon': '로제우동',
  'Rice Ball': '주먹밥',
  'Porkneck Mala Stew': '마라탕',
  'Fried Egg': '계란후라이',
  'Extra Beef': '소고기추가',
  'Extra Shrimp': '새우추가',
  'Boiled Egg': '삶은계란',
  'Chimac Combo': '치맥',
  'Naked Wings': '윙'
};

/** Sauce choices for chicken (required, pick 1). */
export const SAUCES = [
  { id: 'honey-garlic', en: 'Honey Garlic', kr: '허니갈릭' },
  { id: 'volcano',      en: 'Volcano',      kr: '볼케이노', spicy: true },
  { id: 'sweet-spicy',  en: 'Sweet & Spicy', kr: '양념' },
  { id: 'creamy-onion', en: 'Creamy Onion', kr: '' }
];

/** Extras offered on every item sheet. Prices are read from the Extras category in menu.json when present. */
export const SHEET_EXTRAS = [
  { id: 'extra-sauce',  en: 'Extra Sauce',  kr: '소스추가', price: 1.99 },
  { id: 'extra-cheese', en: 'Extra Cheese', kr: '치즈추가', price: 3.99 }
];

/** Guest identities. In production these come from the table session (QR + name prompt). */
export const ME = { id: 'J', name: 'Jae', color: '#ff594f', tc: '#fff' };

export const SEATED = 4; // shown as "4 SEATED" — one seat hasn't joined the app yet ("+1")

/** Seeded demo guests so the split-bill flow is demonstrable from one phone. */
export const SEED_GUESTS = [
  {
    id: 'S', name: 'Soo', color: '#ffbd62', tc: '#2a1c07',
    lines: [
      { name: 'Beef Bulgogi', korean: '소불고기', qty: 1, unit: 24.99 },
      { name: 'Fish Cake Soup', korean: '오뎅탕', qty: 1, unit: 25.99, shared: true }
    ]
  },
  { id: 'M', name: 'Min', color: '#62d88f', tc: '#07240f', lines: [] }
];

export const PAY_METHODS = [
  { id: 'applepay', name: 'Apple Pay', detail: 'Instant' },
  { id: 'card',     name: 'Card', detail: '•••• 4821' },
  { id: 'counter',  name: 'Pay at counter', detail: '현금 OK' }
];

export const HAPPY_HOUR_LINE = 'Happy hour: naked wings $6 · Mon–Wed 5–9 PM';
