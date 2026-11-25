import { useState } from 'react';
import { useSettings } from '../settings/SettingsContext';
import { ADAPTERS, type ProviderId } from '../domain/providers';

const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet',
};

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const store = useSettings();
  const s = store.getSnapshot();
  const [id, setId] = useState<ProviderId>(s.provider?.id ?? 'openai');
  const [apiKey, setApiKey] = useState(s.provider?.apiKey ?? '');
  const [model, setModel] = useState(s.provider?.model ?? DEFAULT_MODELS.openai);
  const [baseUrl, setBaseUrl] = useState(s.provider?.baseUrl ?? '');
  const [speech, setSpeech] = useState(s.speechEnabled);

  function save() {
    store.setProvider({
      id,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
    });
    store.setSpeechEnabled(speech);
    onClose();
  }

  function clear() {
    store.setProvider(null);
    onClose();
  }

  return (
    <div className="modal-backdrop" data-ui="true" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2>Settings</h2>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal__body">
          <p className="modal__note">
            Your API key is stored only in this browser’s local storage and is sent solely to the
            provider you choose. It is never written into the conversation, synced, or sent to us.
          </p>

          <label className="field">
            <span>Provider</span>
            <select
              value={id}
              onChange={(e) => {
                const v = e.target.value as ProviderId;
                setId(v);
                setModel(DEFAULT_MODELS[v]);
              }}
            >
              {Object.values(ADAPTERS).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-… / ak-…"
              autoComplete="off"
              data-ui="true"
            />
          </label>

          <label className="field">
            <span>Model</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </label>

          <label className="field">
            <span>Base URL (optional)</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </label>

          <label className="field field--row">
            <input
              type="checkbox"
              checked={speech}
              onChange={(e) => setSpeech(e.target.checked)}
            />
            <span>Read answers aloud (browser text-to-speech)</span>
          </label>
        </div>

        <footer className="modal__foot">
          <button type="button" className="ghost-btn" onClick={clear}>
            Clear key
          </button>
          <button type="button" className="btn btn--primary" onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
