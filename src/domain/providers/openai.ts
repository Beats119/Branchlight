import type { ProviderConfig, ChatMessage, ProviderRequest } from './types';

const DEFAULT_BASE = 'https://api.openai.com/v1';

/** Shape an OpenAI-compatible chat completion request. */
export function buildOpenAIRequest(cfg: ProviderConfig, messages: ChatMessage[]): ProviderRequest {
  const base = (cfg.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const body = { model: cfg.model, messages, temperature: 0.3 };
  return {
    url,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  };
}

export function parseOpenAIResponse(json: unknown): string {
  const choices = (json as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const text = choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Unexpected OpenAI response shape (missing choices[0].message.content)');
  }
  return text;
}
