import type { Message } from '../domain/types';
import { SelectableText } from './SelectableText';
import { BranchView } from './BranchView';

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="message message--user">
      <div className="message__bubble" data-ui="true">
        {message.content.text}
      </div>
    </div>
  );
}

export function AssistantMessage({ message }: { message: Message }) {
  return (
    <article className="message message--assistant">
      <div className="message__avatar" aria-hidden>
        ✦
      </div>
      <div className="message__body">
        <SelectableText content={message.content} className="prose" />
        {message.branchIds.length > 0 && (
          <div className="branch-list">
            {message.branchIds.map((bid) => (
              <BranchView key={bid} branchId={bid} depth={0} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
