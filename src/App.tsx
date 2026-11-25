import type { ReactNode } from 'react';
import { StoreProvider, ThemeProvider, useBranchlightState } from './context';
import { BranchlightStore } from './domain/store';
import { AppShell } from './components/AppShell';
import { SelectionProvider } from './components/SelectionProvider';
import { ConversationView } from './components/ConversationView';
import { FocusView } from './components/FocusView';

function AppContent() {
  const state = useBranchlightState();
  const focused = state.ui.focusedBranchId;
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
