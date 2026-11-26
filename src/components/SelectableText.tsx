import { useEffect, useRef } from 'react';
import type { Content } from '../domain/types';
import { useSelection, useBranchlightState } from '../context';
import { Icon } from './ui/Icon';

/** Marks never change textContent; DOM Range offsets remain UTF-16 source offsets.
 * Overlaps are rendered as a union of segmented highlights, not nested marks. */
export function SelectableText({ content, className }: { content: Content; className?: string }) {
  const { register, unregister, choosePassage } = useSelection();
  const state = useBranchlightState();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    register(content.id, content.text, ref.current);
    return () => unregister(content.id);
  }, [content.id, content.text, register, unregister]);
  const anchors = Object.values(state.branches)
    .filter((b) => b.parentContentId === content.id && b.anchor.status === 'valid')
    .map((b) => b.anchor);
  const points = [
    ...new Set([0, content.text.length, ...anchors.flatMap((a) => [a.start, a.end])]),
  ].sort((a, b) => a - b);
  return (
    <>
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Answer text"
        data-content-id={content.id}
        className={`selectable ${className || ''}`}
      >
        {points.slice(0, -1).map((start, i) => {
          const end = points[i + 1];
          const active = anchors.some((a) => a.start < end && a.end > start);
          return active ? (
            <mark
              key={start}
              data-anchor-start={start}
              title="A question branches from this passage"
            >
              {content.text.slice(start, end)}
            </mark>
          ) : (
            content.text.slice(start, end)
          );
        })}
      </div>
      <button className="passage-trigger" onClick={() => choosePassage(content.id)}>
        <Icon name="branch" size={15} /> Choose a passage{' '}
        <span className="passage-trigger__hint">to ask a question</span>
      </button>
    </>
  );
}
