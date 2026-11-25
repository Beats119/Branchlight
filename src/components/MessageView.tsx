import type { Message } from '../domain/types';
import { BranchableText } from './BranchableText';

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
        <BranchableText contentId={message.content.id} className="prose" />
      </div>
    </article>
  );
}
