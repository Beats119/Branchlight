import { useStore, useBranchlightState } from '../context';

/** Switches between the sample chat and any uploaded documents. */
export function SourcesBar() {
  const store = useStore();
  const state = useBranchlightState();
  const conversations = Object.values(state.workspace.conversations);
  const activeId = state.workspace.activeConversationId;

  return (
    <div className="sources" role="tablist" aria-label="Sources">
      {conversations.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === activeId}
          className={c.id === activeId ? 'chip chip--active' : 'chip'}
          onClick={() => store.setActiveConversation(c.id)}
        >
          {c.title}
        </button>
      ))}
    </div>
  );
}
