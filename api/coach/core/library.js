/* The exercise catalogue the Coach reasons over, in the five fields it needs.
 *
 * `library-data.js` is generated from the frontend dataset and committed (see
 * scripts/build-coach-assets.mjs) — the same arrangement the translated instruction packs use.
 * It is an ES module rather than JSON on purpose: bare node needs createRequire for JSON, Vite
 * needs an import attribute, and this file has to load under both without either knowing.
 */
import { EXERCISES } from './library-data.js';

export const LIBRARY = EXERCISES;
export const LIB_BY_ID = new Map(LIBRARY.map(e => [e.id, e]));

export const libraryHas = id => LIB_BY_ID.has(id);
export const libraryName = id => LIB_BY_ID.get(id)?.n || null;

/* ---------- the library slice the model gets to choose from ---------- */
export function librarySlice(S, equipment) {
  const wanted = (equipment || []).map(x => String(x).toLowerCase());
  const customs = (S.customEx || []).map(c => ({ id: c.id, n: c.n, bp: c.bp, tg: null, eq: 'custom', custom: true }));
  // No equipment stated (or "everything") ⇒ the whole catalogue. Filtering to nothing would
  // leave the Coach unable to propose anything at all, which is a worse failure than a
  // slightly larger payload.
  const base = wanted.length ? LIBRARY.filter(e => wanted.includes((e.eq || '').toLowerCase())) : LIBRARY;
  return [...customs, ...(base.length ? base : LIBRARY)];
}
