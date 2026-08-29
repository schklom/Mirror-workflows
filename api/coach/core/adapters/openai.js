/* OpenAI — and, through compatible.js, everything that speaks its Chat Completions shape.
 *
 * Chat Completions rather than the newer Responses API on purpose: it is the one request shape
 * Ollama, LM Studio, vLLM, OpenRouter and OpenAI itself all serve, so one implementation covers
 * two providers. `compatible` reuses this spec with a different base URL and an optional key.
 */
import { httpAdapter } from './http.js';
import { SYSTEM_PROMPT } from '../system-prompt.js';

export function chatCompletionsSpec(id, { maxTokensField = 'max_completion_tokens' } = {}) {
  return {
    id,
    path: () => '/v1/chat/completions',
    modelsPath: '/v1/models',
    headers: key => (key ? { authorization: 'Bearer ' + key } : {}),
    body: ({ model, prompt, maxTokens }) => ({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      [maxTokensField]: maxTokens
    }),
    // A server that rejects JSON mode gets the same request once more without it; the parser
    // copes with a fenced or prefaced answer, and the validator is the gate either way.
    withoutJsonMode: body => { const { response_format: _rf, ...rest } = body; return rest; },
    errorMessage: data => data && data.error && (typeof data.error === 'string' ? data.error : data.error.message),
    readText: data => {
      const choice = (data.choices || [])[0];
      if (!choice) return { error: 'the answer had no choices' };
      const content = choice.message && choice.message.content;
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map(p => p.text || '').join('') : '';
      return { text, truncated: choice.finish_reason === 'length' };
    },
    readModels: data => (data.data || data.models || []).map(m => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean)
  };
}

export const openaiSpec = chatCompletionsSpec('openai');
export default httpAdapter(openaiSpec);
