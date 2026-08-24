// utils/memoryIcons.ts
// Iconos SVG generados programáticamente por categoría semántica.
// 12 plantillas geométricas limpias, consistentes y adaptadas para no desbordar.

export const CATEGORY_COLOR: Record<string, string> = {
  food: '#e67e22',
  drink: '#3498db',
  animal: '#27ae60',
  object: '#8e44ad',
  place: '#f39c12',
  action: '#e74c3c',
  clothing: '#9b59b6',
  body: '#1abc9c',
  nature: '#2ecc71',
  transport: '#34495e',
  time: '#f1c40f',
  abstract: '#95a5a6',
};

const templates: Record<string, (color: string) => string> = {
  food: (c) => `
    <circle cx="50" cy="55" r="32" fill="${c}" />
    <ellipse cx="30" cy="30" rx="12" ry="8" fill="#27ae60" transform="rotate(-30 30 30)" />
    <ellipse cx="70" cy="45" rx="8" ry="5" fill="#27ae60" transform="rotate(15 70 45)" />
  `,
  drink: (c) => `
    <rect x="30" y="25" width="40" height="55" rx="8" fill="none" stroke="${c}" stroke-width="6" />
    <path d="M 40 30 Q 50 18 60 30" stroke="${c}" stroke-width="4" fill="none" />
    <rect x="42" y="15" width="16" height="12" rx="4" fill="${c}" />
  `,
  animal: (c) => `
    <ellipse cx="50" cy="60" rx="30" ry="24" fill="${c}" />
    <circle cx="38" cy="50" r="7" fill="#fff" />
    <circle cx="38" cy="50" r="3" fill="#000" />
    <circle cx="62" cy="50" r="7" fill="#fff" />
    <circle cx="62" cy="50" r="3" fill="#000" />
    <ellipse cx="50" cy="72" rx="8" ry="4" fill="#fff" />
    <ellipse cx="50" cy="72" rx="4" ry="2" fill="#000" />
  `,
  object: (c) => `
    <rect x="22" y="28" width="56" height="48" rx="6" fill="none" stroke="${c}" stroke-width="5" />
    <line x1="50" y1="28" x2="50" y2="76" stroke="${c}" stroke-width="3" />
    <line x1="22" y1="52" x2="78" y2="52" stroke="${c}" stroke-width="2" stroke-dasharray="8,4" />
  `,
  place: (c) => `
    <rect x="20" y="42" width="60" height="35" fill="${c}" rx="4" />
    <polygon points="50,12 80,42 20,42" fill="${c}" />
    <rect x="44" y="52" width="12" height="25" fill="#fff" rx="2" />
    <rect x="32" y="55" width="14" height="18" fill="#fff" rx="2" />
    <rect x="54" y="55" width="14" height="18" fill="#fff" rx="2" />
  `,
  action: (c) => `
    <circle cx="50" cy="22" r="14" fill="${c}" />
    <ellipse cx="50" cy="58" rx="20" ry="26" fill="${c}" />
    <line x1="35" y1="52" x2="28" y2="82" stroke="${c}" stroke-width="6" stroke-linecap="round" />
    <line x1="65" y1="52" x2="72" y2="82" stroke="${c}" stroke-width="6" stroke-linecap="round" />
    <line x1="40" y1="70" x2="32" y2="92" stroke="${c}" stroke-width="5" stroke-linecap="round" />
    <line x1="60" y1="70" x2="68" y2="92" stroke="${c}" stroke-width="5" stroke-linecap="round" />
  `,
  clothing: (c) => `
    <path d="M 30 32 L 70 32 L 64 78 L 36 78 Z" fill="${c}" stroke="${c}" stroke-width="2" />
    <rect x="45" y="20" width="10" height="15" fill="${c}" />
    <path d="M 30 32 Q 25 40 22 55 Q 20 65 30 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" />
    <path d="M 70 32 Q 75 40 78 55 Q 80 65 70 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" />
  `,
  body: (c) => `
    <ellipse cx="50" cy="30" rx="20" ry="16" fill="${c}" />
    <circle cx="44" cy="26" r="4" fill="#000" />
    <circle cx="56" cy="26" r="4" fill="#000" />
    <ellipse cx="50" cy="38" rx="8" ry="4" fill="none" stroke="#000" stroke-width="2" />
    <ellipse cx="50" cy="68" rx="28" ry="18" fill="${c}" />
  `,
  nature: (c) => `
    <ellipse cx="50" cy="75" rx="28" ry="16" fill="#8b7355" />
    <circle cx="50" cy="45" r="22" fill="${c}" />
    <ellipse cx="35" cy="40" rx="8" ry="12" fill="#fff" transform="rotate(-20 35 40)" />
    <ellipse cx="65" cy="40" rx="8" ry="12" fill="#fff" transform="rotate(20 65 40)" />
    <circle cx="35" cy="35" r="3" fill="#000" />
    <circle cx="65" cy="35" r="3" fill="#000" />
  `,
  transport: (c) => `
    <rect x="18" y="50" width="64" height="28" rx="6" fill="${c}" />
    <rect x="28" y="35" width="44" height="18" rx="4" fill="${c}" />
    <circle cx="32" cy="78" r="11" fill="#333" />
    <circle cx="68" cy="78" r="11" fill="#333" />
    <circle cx="32" cy="78" r="5" fill="#fff" />
    <circle cx="68" cy="78" r="5" fill="#fff" />
  `,
  time: (c) => `
    <circle cx="50" cy="50" r="42" fill="none" stroke="${c}" stroke-width="5" />
    <circle cx="50" cy="50" r="6" fill="${c}" />
    <line x1="50" y1="50" x2="50" y2="18" stroke="${c}" stroke-width="4" stroke-linecap="round" />
    <line x1="50" y1="50" x2="78" y2="50" stroke="${c}" stroke-width="3" stroke-linecap="round" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="4,4" />
  `,
  abstract: (c) => `
    <path d="M 50 18 C 68 18 78 35 78 50 C 78 65 50 92 50 92 C 50 92 22 65 22 50 C 22 35 32 18 50 18 Z" fill="${c}" />
    <circle cx="50" cy="42" r="12" fill="#fff" opacity="0.3" />
  `,
};

export function getIconSVG(category?: string, _word?: string): string {
  const cat = category && templates[category] ? category : 'abstract';
  const color = CATEGORY_COLOR[cat] || CATEGORY_COLOR.abstract;
  const tpl = templates[cat] || templates.abstract;
  const svg = tpl(color);
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">${svg}</svg>`;
}

export function getCategoryFromColor(category: string): string {
  return CATEGORY_COLOR[category] || CATEGORY_COLOR.abstract;
}
