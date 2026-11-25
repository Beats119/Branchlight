import type { ReactNode } from 'react';
import { StoreProvider, ThemeProvider, useBranchlightState } from './context';
import { BranchlightStore } from './domain/store';
import { SettingsProvider } from './settings/SettingsContext';
import { AppShell } from './components/AppShell';
import { SelectionProvider } from './components/SelectionProvider';
import { ConversationView } from './components/ConversationView';
import { FocusView } from './components/FocusView';
import { SourcesBar } from './components/SourcesBar';

function AppContent() {
  const state = useBranchlightState();
  const focused = state.ui.focusedBranchId;
  if (focused && state.branches[focused]) {
    return <FocusView branchId={focused} />;
  }
  return (
    <>
      <SourcesBar />
      <ConversationView />
    </>
  );
}

export function App({ store: provided }: { store?: BranchlightStore }) {
  return (
    <StoreProvider store={provided}>
      <ThemeProvider>
        <SettingsProvider>
          <AppShell>
            <SelectionProvider>
              <AppContent />
            </SelectionProvider>
          </AppShell>
        </SettingsProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}

export default App;
