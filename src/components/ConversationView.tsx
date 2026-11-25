import { useBranchlightState } from '../context';
import { UserMessage, AssistantMessage } from './MessageView';

export function ConversationView() {
  const state = useBranchlightState();
  const conversation = state.workspace.conversation;

  return (
    <div className="conversation">
      <header className="conversation__header">
        <h1 className="conversation__title">{conversation.title}</h1>
        <p className="conversation__hint">
          Select any sentence in the answer below, then choose <strong>“Ask about this”</strong>. The
          answer appears right where you are — and you can branch again from inside it.
        </p>
      </header>

      {conversation.messages.map((m) =>
        m.role === 'user' ? (
          <UserMessage key={m.id} message={m} />
        ) : (
          <AssistantMessage key={m.id} message={m} />
        ),
      )}

      <footer className="conversation__footer">
        Prototype · answers are generated locally as <strong>mock</strong> responses. No API key or
        network required.
      </footer>
    </div>
  );
}
