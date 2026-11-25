import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildOpenAIRequest, parseOpenAIResponse } from '../openai';
import { buildAnthropicRequest, parseAnthropicResponse } from '../anthropic';
import { getAdapter, isConfigured } from '../index';
import { complete } from '../client';
import type { ProviderConfig, ChatMessage } from '../types';

const cfg: ProviderConfig = { id: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' };
const msgs: ChatMessage[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'hi' },
];

describe('OpenAI adapter', () => {
  it('builds the correct URL, auth header, and body', () => {
    const { url, init } = buildOpenAIRequest(cfg, msgs);
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toEqual(msgs);
  });

  it('honors a custom base URL', () => {
    const { url } = buildOpenAIRequest({ ...cfg, baseUrl: 'https://proxy.test/v1/' }, msgs);
    expect(url).toBe('https://proxy.test/v1/chat/completions');
  });

  it('parses a valid response and rejects a malformed one', () => {
    expect(parseOpenAIResponse({ choices: [{ message: { content: 'hello' } }] })).toBe('hello');
    expect(() => parseOpenAIResponse({})).toThrow();
  });
});

describe('Anthropic adapter', () => {
  const acfg: ProviderConfig = { id: 'anthropic', apiKey: 'ak-test', model: 'claude-3-5-sonnet' };

  it('separates system from messages and targets /v1/messages', () => {
    const { url, init } = buildAnthropicRequest(acfg, msgs);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('ak-test');
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('parses a valid response and rejects a malformed one', () => {
    expect(parseAnthropicResponse({ content: [{ type: 'text', text: 'hi there' }] })).toBe('hi there');
    expect(() => parseAnthropicResponse({ content: [] })).toThrow();
  });
});

describe('adapter registry', () => {
  it('returns the right adapter and validates config', () => {
    expect(getAdapter('openai').id).toBe('openai');
    expect(isConfigured(cfg)).toBe(true);
    expect(isConfigured({ ...cfg, apiKey: '  ' })).toBe(false);
    expect(isConfigured(null)).toBe(false);
  });
});

describe('complete()', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed text on a successful request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'real answer' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await complete(cfg, msgs);
    expect(text).toBe('real answer');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }),
    );
    await expect(complete(cfg, msgs)).rejects.toThrow(/401/);
  });

  it('throws when not configured', async () => {
    await expect(complete({ ...cfg, apiKey: '' }, msgs)).rejects.toThrow(/not configured/);
  });
});
