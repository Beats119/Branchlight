import { useBranchlightState, useSelection } from '../context';
import { UserMessage, AssistantMessage } from './MessageView';
import { Icon } from './ui/Icon';

export function ConversationView() {
  const state = useBranchlightState();
  const { choosePassage } = useSelection();
  const conversation = state.workspace.conversation;
  const assistant = conversation.messages.find((m) => m.role === 'assistant');
  const count = Object.keys(state.branches).length;
  return (
    <div className="conversation">
      <header className="conversation__header">
        <div className="conversation__eyebrow">
          <span className="eyebrow">EXPLORATION 001</span>
          <span className="eyebrow-separator">/</span>
          <span className="topic-tag">BIOLOGY & HEALTH</span>
        </div>
        <h1 className="conversation__title" tabIndex={-1}>
          {conversation.title}
        </h1>
        <p className="conversation__hint">
          Every answer is a starting point. See where your curiosity takes you.
        </p>
        <div className="conversation__meta">
          <span>
            <Icon name="book" size={14} /> 3 min read
          </span>
          <span>·</span>
          <span>
            <Icon name="branch" size={14} /> {count} {count === 1 ? 'branch' : 'branches'}
          </span>
          <span className="conversation__mode">DEMO EXPLORATION</span>
        </div>
      </header>
      {conversation.messages.map((m) =>
        m.role === 'user' ? (
          <UserMessage key={m.id} message={m} />
        ) : (
          <AssistantMessage key={m.id} message={m} />
        ),
      )}
      {count === 0 && assistant && (
        <div className="first-branch">
          <span className="first-branch__icon">
            <Icon name="branch" size={22} />
          </span>
          <div>
            <strong>Something spark a question?</strong>
            <p>Select any passage above, or choose one to start your first branch.</p>
          </div>
          <button className="btn btn--ghost" onClick={() => choosePassage(assistant.content.id)}>
            Explore a passage <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      <footer className="conversation__footer">
        <span className="small-spark">✳</span>
        <span>
          Room for every “wait, why?”
          <small>
            This is a local prototype. All answers are scripted mock responses, not medical advice.
          </small>
        </span>
      </footer>
    </div>
  );
}
