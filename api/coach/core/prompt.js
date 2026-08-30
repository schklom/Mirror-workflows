/* Prompt assembly. The editable source is api/coach/prompts/*.md; `prompts.js` next to this
 * file is generated from it (scripts/build-coach-assets.mjs) so the same text is importable by
 * the server under bare node and by the phone under Vite, with neither reading a file. */
import { PROMPTS } from './prompts.js';

export function buildPrompt(kind, payload, repair) {
  const task = kind === 'review' ? 'review' : kind === 'debrief' ? 'debrief' : payload.refine ? 'refine' : 'create';
  let out = PROMPTS.common + '\n\n---\n\n' + PROMPTS[task] +
    '\n\n---\n\n## Payload\n\n```json\n' + JSON.stringify(payload, null, 1) + '\n```\n';
  if (repair) {
    out += '\n\n---\n\n' + PROMPTS.repair
      .replace('{{PREVIOUS}}', String(repair.previous || '').slice(0, 4000))
      .replace('{{ERRORS}}', repair.errors.map(e => '- ' + e).join('\n'));
  }
  return out;
}
