import type { Message } from '../domain/types';
import { SelectableText } from './SelectableText';
import { BranchView } from './BranchView';
import { Icon } from './ui/Icon';

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="message message--user">
      <div className="message__user-label">
        <span className="user-avatar user-avatar--small">Y</span>
        <span>YOUR QUESTION</span>
      </div>
      <div className="message__bubble" data-ui="true">
        {message.content.text}
      </div>
    </div>
  );
}
export function AssistantMessage({ message }: { message: Message }) {
  return (
    <article className="message message--assistant">
      <div className="message__answer-heading">
        <span className="message__identity">
          <span className="message__avatar">
            <Icon name="branch" size={16} />
          </span>
          Branchlight<span className="answer-label">DEMO ANSWER</span>
        </span>
        <span className="selection-hint">
          <span aria-hidden>⌁</span> Select text to explore
        </span>
      </div>
      <div className="message__body">
        <SelectableText content={message.content} className="prose" />
        {message.branchIds.length > 0 && (
          <div className="branch-list branch-list--root">
            <div className="branch-list__label">
              <Icon name="branch" size={15} /> QUESTIONS FROM THIS EXPLANATION
            </div>
            {message.branchIds.map((id) => (
              <BranchView key={id} branchId={id} depth={0} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
