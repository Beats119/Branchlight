import { useEffect, useRef, type ReactNode } from 'react';

/** Shared accessible modal: focus containment, Escape, backdrop, focus restore. */
export function Modal({
  label,
  onClose,
  className = '',
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const controls = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input, [tabindex="0"]'),
      );
    (el.querySelector<HTMLElement>('[data-autofocus]') || controls()[0] || el).focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key !== 'Tab') return;
      const list = controls();
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    el.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      data-ui="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`modal ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
