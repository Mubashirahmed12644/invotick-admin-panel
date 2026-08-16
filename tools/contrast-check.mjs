#!/usr/bin/env node
/**
 * Contrast and role-pairing check for the panel's stylesheet.
 *
 * ## Why this is static, and not the browser audit
 *
 * The browser audit that ran during the M3 migration walks the rendered DOM, so it can only judge
 * what happened to be on screen. `.live-params` — the expanded event payload on Live Events — only
 * renders once a user is selected *and* that user's event carries params, so it was never visited,
 * and it shipped as `background: primary` with `color: on-surface-variant`: 1.46:1 in light and
 * 1.00:1 in dark, which is text and ground at identical luminance. Unreadable, in both themes, on
 * the page whose whole job is reading payloads.
 *
 * A rendered-only audit will keep missing rules like that, because "render this state" is a growing
 * list nobody maintains. This reads the stylesheet instead, so a rule is checked whether or not
 * anyone can currently get it on screen.
 *
 * ## The two things it checks
 *
 * 1. **Contrast.** Any rule that paints both a ground and text is self-contained — its ratio can be
 *    computed exactly, for both themes, with no page involved.
 * 2. **Role pairing.** M3 roles come in pairs: `primary` carries `on-primary`, and nothing else. A
 *    mismatched pair can still pass contrast today by luck — `.sidebar-badge` had `on-primary` on an
 *    `error` ground and passed, because in the current seed both on-colours happen to be near-white.
 *    The palette is generated from a seed at runtime, so that is a bug waiting for a seed change.
 *
 * Run: `npm run check:contrast`
 */
import { readFileSync } from 'node:fs';

const m3 = readFileSync(new URL('../app/m3.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/** The declarations of the first block whose opening line matches `pattern`. */
function block(css, pattern) {
  const m = css.match(pattern);
  if (!m) return {};
  let i = css.indexOf('{', m.index);
  let depth = 0, j = i;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}' && --depth === 0) break;
  }
  return Object.fromEntries(
    [...css.slice(i, j).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]),
  );
}

const rootTokens = block(globals, /^:root\s*\{/m);
const light = { ...rootTokens, ...block(m3, /^:root\s*\{/m), ...block(m3, /^:root\[data-theme="light"\]\s*\{/m) };
const dark = { ...light, ...block(m3, /^:root\[data-theme="dark"\]\s*\{/m) };

const resolve = (value, tokens) => {
  let v = value;
  for (let i = 0; i < 6; i++) {
    const next = v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g,
      (_, name, fallback) => (tokens[name] ?? fallback ?? '').trim());
    if (next === v) break;
    v = next;
  }
  return v.trim();
};

function rgb(value) {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1);
  m = v.match(/^rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
}

const lum = (c) => {
  const f = (x) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : (((x / 255) + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
// Alpha is composited over what is behind it, never ignored — a 12%-alpha colour treated as opaque
// produces failures that are not real, and the noise is what makes a check like this get switched off.
const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** What each M3 ground legally carries. `surface-*` also carries the accents, as text on a card. */
const SURFACE_FG = ['on-surface', 'on-surface-variant', 'primary', 'secondary', 'tertiary', 'error',
  'outline', 'success', 'warning', 'info'];
const PAIRS = {
  primary: ['on-primary'], secondary: ['on-secondary'], tertiary: ['on-tertiary'], error: ['on-error'],
  'primary-container': ['on-primary-container'], 'secondary-container': ['on-secondary-container'],
  'tertiary-container': ['on-tertiary-container'], 'error-container': ['on-error-container'],
  'inverse-surface': ['inverse-on-surface'], 'inverse-primary': ['on-primary-container', 'on-surface'],
  background: ['on-background', 'on-surface', 'on-surface-variant'],
};
for (const s of ['surface', 'surface-variant', 'surface-dim', 'surface-bright', 'surface-container',
  'surface-container-low', 'surface-container-lowest', 'surface-container-high',
  'surface-container-highest']) PAIRS[s] = SURFACE_FG;

const PAGE = { light: [255, 255, 255, 1], dark: [0, 0, 0, 1] };
const problems = [];

for (const m of globals.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim().split('\n').pop().trim();
  const body = m[2];
  if (selector.startsWith('@') || /::|:hover|:focus|:active/.test(selector)) continue;

  const bgDecl = body.match(/(?<![-\w])background(?:-color)?\s*:\s*([^;]+);/);
  const fgDecl = body.match(/(?<![-\w])color\s*:\s*([^;]+);/);
  if (!bgDecl || !fgDecl) continue;
  const line = globals.slice(0, m.index).split('\n').length;

  // 1. role pairing — independent of what the numbers happen to be today
  const bgRole = bgDecl[1].match(/--md-sys-color-([\w-]+)/)?.[1];
  const fgRole = fgDecl[1].match(/--md-sys-color-([\w-]+)/)?.[1];
  if (bgRole && fgRole && PAIRS[bgRole] && !PAIRS[bgRole].includes(fgRole)) {
    problems.push({ line, selector, kind: 'pairing',
      detail: `background is \`${bgRole}\`, which carries ${PAIRS[bgRole].map((r) => `\`${r}\``).join(' or ')} — not \`${fgRole}\`` });
  }

  // 2. measured contrast, in both themes
  const size = body.match(/font-size\s*:\s*([\d.]+)(rem|px)/);
  const px = size ? (size[2] === 'rem' ? parseFloat(size[1]) * 16 : parseFloat(size[1])) : 16;
  const bold = /font-weight\s*:\s*([6-9]\d\d|bold)/.test(body);
  const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;

  for (const [theme, tokens] of [['light', light], ['dark', dark]]) {
    const b = rgb(resolve(bgDecl[1], tokens));
    const f = rgb(resolve(fgDecl[1], tokens));
    if (!b || !f) continue;
    const ground = b[3] < 1 ? over(b, PAGE[theme]) : b;
    const text = f[3] < 1 ? over(f, ground) : f;
    const ratio = contrast(text, ground);
    if (ratio < need) {
      problems.push({ line, selector, kind: 'contrast',
        detail: `${ratio.toFixed(2)}:1 in ${theme} (needs ${need}:1) — text ${resolve(fgDecl[1], tokens)} on ${resolve(bgDecl[1], tokens)}` });
    }
  }
}

if (!problems.length) {
  console.log('contrast-check: no failures');
  process.exit(0);
}
console.error(`contrast-check: ${problems.length} problem(s)\n`);
for (const p of problems.sort((a, b) => a.line - b.line)) {
  console.error(`  app/globals.css:${p.line}  ${p.selector}\n    ${p.kind}: ${p.detail}\n`);
}
process.exit(1);
