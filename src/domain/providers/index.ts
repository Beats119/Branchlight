import type { ProviderConfig, ChatMessage, ProviderRequest } from './types';
import { buildOpenAIRequest, parseOpenAIResponse } from './openai';
import { buildAnthropicRequest, parseAnthropicResponse } from './anthropic';

export interface ProviderAdapter {
  id: ProviderConfig['id'];
  label: string;
  buildRequest: (cfg: ProviderConfig, messages: ChatMessage[]) => ProviderRequest;
  parseResponse: (json: unknown) => string;
}

export const ADAPTERS: Record<ProviderConfig['id'], ProviderAdapter> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    buildRequest: buildAnthropicRequest,
    parseResponse: parseAnthropicResponse,
  },
};

export function getAdapter(id: ProviderConfig['id']): ProviderAdapter {
  return ADAPTERS[id];
}

export function isConfigured(cfg: ProviderConfig | null): cfg is ProviderConfig {
  return !!cfg && cfg.apiKey.trim().length > 0 && cfg.model.trim().length > 0;
}

export { complete } from './client';
export type { ProviderConfig, ProviderId, ProviderRequest, ChatMessage } from './types';
