/** Provider-agnostic chat types for the BYOK (bring-your-own-key) milestone. */

export type ProviderId = 'openai' | 'anthropic';

export interface ProviderConfig {
  id: ProviderId;
  apiKey: string;
  model: string;
  /** Optional custom base URL (e.g. a compatible proxy). */
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A ready-to-fetch request, fully shaped for one provider. */
export interface ProviderRequest {
  url: string;
  init: RequestInit;
}
