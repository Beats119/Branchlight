import type { ProviderConfig, ChatMessage } from './types';
import { getAdapter, isConfigured } from './index';

/**
 * Call a real provider using the user-supplied config. No key, model, or base
 * URL is ever stored in the conversation blob or sent anywhere except the
 * provider the user chose. Throws on transport/HTTP errors so callers can fall
 * back to the mock responder.
 */
export async function complete(cfg: ProviderConfig, messages: ChatMessage[]): Promise<string> {
  if (!isConfigured(cfg)) {
    throw new Error('Provider is not configured (missing API key or model).');
  }
  const adapter = getAdapter(cfg.id);
  const { url, init } = adapter.buildRequest(cfg, messages);
  const res = await fetch(url, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Provider request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = await res.json();
  return adapter.parseResponse(json);
}
