import type { ProviderConfig, ChatMessage, ProviderRequest } from './types';

const DEFAULT_BASE = 'https://api.anthropic.com';

/** Shape an Anthropic Messages API request (system is a top-level field). */
export function buildAnthropicRequest(cfg: ProviderConfig, messages: ChatMessage[]): ProviderRequest {
  const base = (cfg.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
  const url = `${base}/v1/messages`;
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  const body = { model: cfg.model, max_tokens: 1024, system, messages: conversation };
  return {
    url,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    },
  };
}

export function parseAnthropicResponse(json: unknown): string {
  const content = (json as { content?: Array<{ type?: string; text?: unknown }> }).content;
  const textBlock = content?.find((b) => b.type === 'text');
  if (typeof textBlock?.text === 'string') return textBlock.text;
  throw new Error('Unexpected Anthropic response shape (missing content[].text)');
}
