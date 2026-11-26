import { useLayoutEffect, useRef } from 'react';
import { StoreProvider, ThemeProvider, useBranchlightState } from './context';
import { BranchlightStore } from './domain/store';
import { AppShell } from './components/AppShell';
import { SelectionProvider } from './components/SelectionProvider';
import { ConversationView } from './components/ConversationView';
import { FocusView } from './components/FocusView';

function AppContent() {
  const state = useBranchlightState();
  const focused = state.ui.focusedBranchId;
  const positions = useRef(new Map<string, number>());
  const previousContext = useRef(focused);
  useLayoutEffect(() => {
    if (previousContext.current !== focused) {
      document.querySelector<HTMLElement>('.reading-column h1')?.focus({ preventScroll: true });
      previousContext.current = focused;
    }
    const key = focused || 'conversation';
    const y = positions.current.get(key) || 0;
    if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' });
    const save = () => positions.current.set(key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
    };
  }, [focused]);
  if (focused && state.branches[focused]) {
    return <FocusView branchId={focused} />;
  }
  return <ConversationView />;
}

export function App({ store: provided }: { store?: BranchlightStore }) {
  return (
    <StoreProvider store={provided}>
      <ThemeProvider>
        <AppShell>
          <SelectionProvider>
            <AppContent />
          </SelectionProvider>
        </AppShell>
      </ThemeProvider>
    </StoreProvider>
  );
}

export default App;
