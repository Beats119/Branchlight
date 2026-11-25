import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library leaves mounted components between tests; clean up.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia; the UI reads it for reduced-motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
