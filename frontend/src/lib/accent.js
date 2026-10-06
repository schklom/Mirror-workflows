// The accent colour: one of the presets (lib/format.js ACCENTS) or a colour of the user's own.
//
// Stored as two synced settings: `accent` names the choice ('lime', 'sky', … or 'custom') and
// `accentCustom` keeps the user's own colour as '#rrggbb', also while a preset is picked, so
// going back to it brings the same colour back. An app from before this knows no 'custom' and
// draws its default green (App.jsx falls back on any key it does not know), and leaves
// `accentCustom` alone like any other key it does not read.
//
// Nothing here trusts the stored value: it comes from other devices, backups and the server, and
// the colour ends up in CSS custom properties and in the Android notification. Only a plain
// six-digit hex gets that far; anything else is the default accent.
//
// A preset has a dark and a light shade of its own (index.css). The user's colour is one colour,
// so for each theme it is checked against that theme's backgrounds and, when it would vanish into
// them (navy on black, pale yellow on white), made lighter or darker just far enough to be read.
// The bars come from the presets: each one clears them as shipped, all but yellow in light mode
// (THEMES below, accent.test.js).
import { ACCENTS, ACCENT_INK } from './format.js'

export const DEFAULT_ACCENT = 'lime'
export const CUSTOM = 'custom'

const HEX = /^#[0-9a-f]{6}$/i
// What a stored `accent` may be at all: a short lowercase word. One this version does not know
// (a preset added later) is kept as it is and drawn as the default until the app learns it.
const KEY = /^[a-z][a-z0-9-]{0,23}$/

/** '#rrggbb' in lowercase, or null for anything else ('#abc', 'red', 'url(…)', a number). */
export function cleanHex(v) {
  return typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : null
}

/**
 * A copy's accent fields made safe, in place: a malformed `accentCustom` is dropped and an
 * `accent` that is not even a word goes back to the default. Returns the copy.
 */
export function sanitizeAccent(s) {
  if (!s || typeof s !== 'object') return s
  if ('accentCustom' in s) {
    const hex = cleanHex(s.accentCustom)
    if (hex) s.accentCustom = hex; else delete s.accentCustom
  }
  if ('accent' in s && !(typeof s.accent === 'string' && KEY.test(s.accent))) s.accent = DEFAULT_ACCENT
  return s
}

/** The choice to draw: a known preset key, 'custom' with a usable colour, or the default. */
export function accentKey(S) {
  const k = S?.accent
  if (typeof k === 'string' && Object.hasOwn(ACCENTS, k)) return k
  if (k === CUSTOM && cleanHex(S?.accentCustom)) return CUSTOM
  return DEFAULT_ACCENT
}

/**
 * The value the rest of the app passes around (the rest alert, the native countdown): a preset
 * key, or the user's colour itself as '#rrggbb'.
 */
export function accentValue(S) {
  const k = accentKey(S)
  return k === CUSTOM ? cleanHex(S.accentCustom) : k
}

// --- colour maths (sRGB, WCAG 2 relative luminance) ---
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const toHex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }

export function luminance(hex) {
  const [r, g, b] = rgb(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio of two '#rrggbb' colours, 1 to 21. */
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** `hex` moved `t` (0–1) of the way to `to`. */
export function mix(hex, to, t) {
  const a = rgb(hex), b = rgb(to)
  return toHex(a.map((v, i) => v + (b[i] - v) * t))
}

/** Black or white, whichever reads better on `hex` (black on a tie). */
export function inkOn(hex) {
  return contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff'
}

// Each theme's page and card fill (index.css --bg / --surface), and how far the accent has to
// stand out from the weaker of the two. Dark: the bluest presets sit at 4.7:1 on a card, so 3:1
// (the WCAG bar for large text and controls) leaves them all untouched. Light: Apple's own green
// and orange stand at about 2:1 on the light page, so 1.8:1 keeps every preset but yellow (1.35,
// the one preset that is hard to read there) and turns a pastel that would be invisible darker.
export const THEMES = {
  dark: { bgs: ['#000000', '#1c1c1e'], min: 3, toward: '#ffffff' },
  light: { bgs: ['#f2f2f7', '#ffffff'], min: 1.8, toward: '#000000' },
}

const worst = (hex, bgs) => Math.min(...bgs.map(b => contrast(hex, b)))

// HSL, for moving a colour's lightness without washing it out: mixing navy with white gives a
// greyish lilac, raising its lightness gives a clear blue (and a pale yellow turns gold, not khaki).
function toHsl(hex) {
  const [r, g, b] = rgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function fromHsl([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return toHex([r, g, b].map(v => (v + m) * 255))
}

/**
 * `hex` as drawn in `theme`: unchanged when it already stands out enough, otherwise made lighter
 * (dark theme) or darker (light theme) in small steps of HSL lightness until it does, hue and
 * saturation kept.
 */
export function readableIn(hex, theme) {
  const th = THEMES[theme] || THEMES.dark
  if (worst(hex, th.bgs) >= th.min) return hex
  const [h, s, l] = toHsl(hex)
  const up = th.toward === '#ffffff'
  for (let i = 1; i <= 50; i++) {
    const c = fromHsl([h < 0 ? h + 360 : h, s, up ? Math.min(1, l + i * 0.02) : Math.max(0, l - i * 0.02)])
    if (worst(c, th.bgs) >= th.min) return c
  }
  return th.toward
}

/** Whether `hex` is drawn differently from itself in `theme` (Settings says so). */
export const adjustedIn = (hex, theme) => readableIn(hex, theme) !== hex

/**
 * The CSS custom properties for the user's colour in `theme`, the same set a preset defines in
 * index.css: the accent, its pressed shade and the text on it. The soft and line tints are
 * mixed from --acc in index.css and follow on their own. null for anything but a valid hex.
 */
export function customAccentVars(hex, theme) {
  const c = cleanHex(hex)
  if (!c) return null
  const acc = readableIn(c, theme)
  return { '--acc': acc, '--acc-2': mix(acc, '#000000', 0.25), '--on-acc': inkOn(acc) }
}

/** The colour and its text colour for a preset key or a '#rrggbb' value (native notification). */
export function accentPair(v) {
  const hex = cleanHex(v)
  if (hex) return { accent: hex, ink: inkOn(hex) }
  const k = typeof v === 'string' && Object.hasOwn(ACCENTS, v) ? v : DEFAULT_ACCENT
  return { accent: ACCENTS[k], ink: ACCENT_INK[k] }
}

const CUSTOM_VARS = ['--acc', '--acc-2', '--on-acc']

/**
 * Puts the accent on the page root: a preset by `data-accent` (index.css does the rest), the
 * user's colour as inline custom properties for the resolved `theme`. `value` is accentValue's.
 */
export function applyAccent(el, value, theme) {
  const vars = customAccentVars(value, theme)
  if (vars) {
    el.dataset.accent = CUSTOM
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
    return
  }
  el.dataset.accent = typeof value === 'string' && Object.hasOwn(ACCENTS, value) ? value : DEFAULT_ACCENT
  for (const k of CUSTOM_VARS) el.style.removeProperty(k)
}
