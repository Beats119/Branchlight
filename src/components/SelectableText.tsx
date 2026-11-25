import { useEffect, useRef } from 'react';
import type { Content } from '../domain/types';
import { useSelection } from '../context';

/**
 * Renders one immutable Content as selectable text and registers its DOM node
 * so the centralized selection tracker can map a native selection back to this
 * content id. The text is rendered in a single whitespace-preserving element so
 * that the DOM text exactly equals Content.text (required for offset accuracy).
 */
export function SelectableText({ content, className }: { content: Content; className?: string }) {
  const { register, unregister } = useSelection();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    register(content.id, content.text, ref.current);
    return () => unregister(content.id);
  }, [content.id, content.text, register, unregister]);

  return (
    <div
      ref={ref}
      data-content-id={content.id}
      className={`selectable${className ? ` ${className}` : ''}`}
    >
      {content.text}
    </div>
  );
}
