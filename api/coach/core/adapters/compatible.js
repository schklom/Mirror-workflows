/* Any OpenAI-compatible endpoint: Ollama, LM Studio, vLLM, OpenRouter, a gateway of your own.
 * Same wire shape as openai.js; the base URL comes from configuration and the key is optional.
 * `max_tokens` rather than `max_completion_tokens` because that is the field every one of
 * those servers understands. */
import { httpAdapter } from './http.js';
import { chatCompletionsSpec } from './openai.js';

export const compatibleSpec = chatCompletionsSpec('compatible', { maxTokensField: 'max_tokens' });
export default httpAdapter(compatibleSpec);
