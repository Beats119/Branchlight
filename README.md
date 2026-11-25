# Branchlight

> **Follow every question.**

Branchlight is a reading companion where **any passage inside an AI explanation can become its own in-place conversation** — and any passage inside *that* conversation can become another. Instead of a linear chat that dumps answers at the bottom, Branchlight lets you branch directly from the sentence you don't understand, collapse the digression when you're done, and keep reading.

This repository contains the product through **Milestone 2**: a polished, local, runnable prototype whose core is the in-place branching interaction, now extended with **real, local features** you can test immediately — uploading documents (PDF/text) and branching from them, browser-native read-aloud, and a bring-your-own-key (BYOK) adapter so answers can come from a real LLM the moment you paste your key. No paid service is introduced; external calls use *your* provider with *your* key.

---

## The core interaction

1. You read an AI-generated answer in the main column.
2. You **select a word, sentence, or passage inside that answer**.
3. A small **“Ask about this”** control appears right there.
4. You ask a question; the answer is attached **to that exact passage as an inline comment** — not dropped at the bottom of the chat.
5. The selected text becomes a **highlight with a comment marker at its end**. The reply shows in a small **popover thread** anchored to that marker.
6. When you're done, the thread **collapses back into the comment icon** at the end of the highlight. Click the icon to reopen it.
7. You can select text **inside that reply** and branch again — nested as deep as you like, each level its own inline comment. Deep threads open in a **focus view** with breadcrumbs.

That is the whole invention: a comment thread lives *inside the same response*, anchored to the passage it explains. Everything else (documents, voice, diagrams, search) is planned for later milestones and is deliberately *not* in this build.

---

## What's implemented (Milestones 1–2)

- A polished, reading-focused UI (light + dark themes, full keyboard operability, reduced-motion support).
- The **inline comment-thread** interaction: highlight a passage → a comment marker appears at its end → the reply opens as a popover thread there → collapse it back to the icon. Nested as deep as you like.
- **Documents (real, key-free):** upload a `.txt` / `.md` or **PDF**; it becomes a source you can read and branch from, just like the sample answer. Switch sources with the Sources bar.
- **Real LLM via BYOK (real, with your key):** an OpenAI / Anthropic adapter. Enter your key in **Settings** (stored only in this browser's local storage, never in the conversation); answers then come from the provider, with mock fallback if the call fails.
- **Voice (real, key-free):** a **Speak** button uses the browser's native text-to-speech to read any thread answer aloud.
- **Local persistence** of branches, anchors, documents, collapse/focus state, and settings across restarts.
- **Anchor validation on load** so a branch can never silently point at the wrong passage.
- A test suite (domain + component) built around the behavior — 60 tests passing.

### Explicitly out of scope (deferred milestones)

- Web search & citations (needs a search-API key), structured/AI-generated diagrams, accounts, cloud sync, managed hosting, and an Electron desktop shell (the domain layer is Electron-ready, but a desktop GUI can't be verified in this build environment). The architecture leaves clean extension points for each.

---

## Tech stack & key decisions

| Concern | Choice | Why |
| --- | --- | --- |
| Language / UI | **TypeScript + React 18** | Mature, types catch anchor/offset mistakes early. |
| Build / dev | **Vite 5** | Fast, simple, standard. |
| Tests | **Vitest 2 + Testing Library (jsdom)** | Fast unit + component testing in one runner. |
| Persistence | **`StorageLike` repository** (localStorage in browser, in-memory in tests) | Decouples the domain from any backend; can migrate to SQLite / Electron `safeStorage` later. |
| Documents | **pdfjs-dist** (lazy-loaded) + native FileReader for txt/md | Extracts per-page text so any passage becomes branchable; worker is code-split. |
| Real LLM | **Provider adapter** (`src/domain/providers`) | OpenAI- and Anthropic-shaped requests behind one interface; BYOK, mock fallback. |
| Voice | **Web Speech API** (`speechSynthesis`) | Browser-native read-aloud, no key, no network. |
| Styling | **Hand-written CSS design tokens** | Full control over the calm, reading-focused aesthetic; no heavy UI dependency. |

### Decision: browser-first instead of Electron (deviation, documented)

The original candidate stack named **Electron**. For *this milestone* I built a **browser-first web app** and kept the entire branching engine in a framework-agnostic `src/domain` layer. Rationale:

- The sandbox is headless; an Electron desktop window cannot be launched or verified here, and Playwright browser binaries cannot be downloaded (their CDNs are not reachable). A browser build is the only variant I can actually run and test end-to-end.
- The domain logic (model, anchoring, store) has **zero React/DOM imports**, so the exact same UI drops into an Electron `BrowserView` with a preload/IPC shim later — no rewrite. The `StorageLike` interface is the seam where `safeStorage` + SQLite would plug in.

This follows the spec's explicit allowance to recommend a browser-only prototype and document the trade-off. The delivery target can move to Electron in a later milestone without changing the product logic.

---

## Getting started

Requirements: **Node 18+** (developed on Node 22).

```bash
# 1. Install dependencies
npm install

# 2. Run the prototype (local dev server, opens on http://localhost:5173)
npm run dev

# 3. Build for production (type-check + bundle into dist/)
npm run build

# 4. Preview the production build
npm run preview
```

No API key or network connection is required.

---

## Testing

```bash
# Run the full suite once
npm test

# Watch mode
npm run test:watch

# Type-check only
npm run typecheck
```

**What is covered automatically (41 tests, all passing):**
- **Anchoring** — offset building, UTF-16 / emoji handling, anchor validation, corrupted-anchor detection.
- **Branching engine** — validation of empty/bad/mismatched input, nesting, multiple branches per passage, immutable transitions, serialization round-trips, breadcrumb paths, depth, collapse, focus, and reload validation.
- **Store** — seeding, persistence to storage, reload from storage, subscriber notification, reset.
- **Selection offset mapping** — real DOM `TreeWalker`/`Range` logic across nested nodes.
- **React components** — renders question + answer; renders inline branches with excerpt/question/mock label; collapse hides nested children and reopens; corrupted anchors show a recoverable warning; branches survive a "restart" (new store over same storage); selection toolbar and composer behavior.

**What is verified manually (cannot be faithfully automated here):**
Native text selection (`window.getSelection` + `Range`) is unreliable to simulate in jsdom, so the *end-to-end pointer flow* (mouse-drag a sentence → toolbar appears → type → branch appears) is covered by unit-tested primitives (`getOffsetWithin`, `buildAnchor`, `createBranch`) plus a documented manual walkthrough below. A real browser is required to exercise the native selection itself.

---

## Manual demo walkthrough (acceptance criteria)

After `npm run dev`:

1. The app launches with no key. ✅
2. Read the sample answer about vaccine/immune memory. ✅
3. **Select** a sentence in the answer (e.g. *“When immune cells encounter this material…”*). ✅
4. Click **“Ask about this”**, type *“Explain this simply”*, and submit. ✅
5. The selected sentence becomes a **highlight**, with a **comment marker at its end**. The reply opens as a **popover thread** right there, showing your question + a labeled mock answer. ✅
6. **Click the comment icon** to collapse the thread back to just the icon; click again to reopen. ✅
7. **Select text inside that reply** and branch again — nested inline comments, each its own highlight + marker. ✅
8. Explore **3+ levels**; each thread is a fixed-width popover, so the reading column never shrinks. Use **Focus** for deep branches. ✅
9. Use the **Focus** view breadcrumbs to navigate up and **“← Conversation”** to return to the parent. ✅
10. **Reload the page** — your branches, anchors, and collapse state are still there. ✅
11. (Trust check) The engine validates anchors on load; a tampered source text surfaces a *“source passage could not be found”* recoverable state rather than attaching to the wrong text. ✅
12. Resize the window — the layout stays usable; theme toggle works. ✅
13. Tab/Enter through the composer and controls — everything is keyboard reachable with visible focus rings. ✅

### Real features to try (no paid service introduced)

- **Documents:** click **Upload**, choose a `.txt`/`.md`/PDF. It appears as a new source in the Sources bar; click it and branch from any passage in the document exactly as from an answer.
- **Real AI answers:** open **Settings**, pick a provider, paste your API key + model, Save. Now your "Ask" calls that provider; the answer is badged **AI answer** (not *mock*). Leave the key empty and it gracefully falls back to the mock.
- **Voice:** with read-aloud enabled in Settings, each thread has a **🔊 Speak** button that reads the answer using your browser's built-in speech (no key, no network).

---

## Architecture

```
src/
  domain/                 # Framework-agnostic core (NO React/DOM imports)
    types.ts              # Content, SelectionAnchor, Branch, PersistedState
    ids.ts                # id helper
    anchoring.ts          # buildAnchor / validateAnchor (UTF-16 offsets)
    branching.ts          # createBranch, toggleCollapse, setFocus, paths, validation
    mockAi.ts             # local mock responder (clearly labeled)
    sampleData.ts         # deterministic seed conversation (FIXED ids)
    store.ts              # BranchlightStore + StorageLike (localStorage / memory)
    index.ts
    __tests__/            # domain + store + (shared) offset tests
  selection/
    offset.ts             # DOM (node,offset) -> UTF-16 char offset within root
    useTextSelection.ts   # centralized native-selection tracker -> SelectionInfo
  components/
    AppShell.tsx          # app bar, brand, upload, settings, theme toggle, reset
    ConversationView.tsx  # the reading column
    MessageView.tsx       # user + assistant messages
    BranchableText.tsx    # renders Content as selectable text with inline highlight + comment marker + popover thread (recursive for nesting)
    SelectionProvider.tsx # owns live selection, renders overlay, creates branches (mock or real)
    SelectionOverlay.tsx  # floating toolbar + composer
    FocusView.tsx         # breadcrumbed full-width branch view
    Breadcrumbs.tsx
    SourcesBar.tsx        # switch between sample chat and uploaded documents
    SettingsPanel.tsx     # BYOK provider config + speech toggle (local only)
  settings/               # SettingsStore (localStorage) + React context
  audio/tts.ts           # browser-native read-aloud
  documents/pdf.ts        # lazy-loaded PDF text extraction (pdfjs-dist)
  domain/providers/       # provider types, OpenAI/Anthropic adapters, client
    __tests__/app.test.tsx
  context.tsx             # Store / Theme / Selection React contexts + hooks
  App.tsx
  main.tsx
  index.css               # design tokens + component styles (light/dark)
```

### Domain model (the real invention)

- A **`Content`** is any immutable, anchorable piece of text — a message body *or* a branch answer.
- A **`Branch`** records `parentContentId`, a **`SelectionAnchor`** (`start`/`end` UTF-16 offsets + `exactText` + surrounding context), the user `question`, its own answer `Content`, and `childBranchIds`.
- The tree is **derived** from parent/child id references, so there is no maximum depth and rendering can change (inline, panel, focus) without touching the data.
- **Anchoring convention:** offsets are UTF-16 code-unit indices (JS `String.slice` semantics). On every load the anchor is re-checked against the immutable parent text; a mismatch flips `status` to `unavailable` and the UI shows a recoverable warning instead of misattaching.

### Why mock answers are safe

`createBranch` always sets `mock: true` in this milestone, and the UI renders a **“Demo answer · mock”** badge. No code path calls a network or model.

---

## Extension points (future milestones, not built yet)

The first milestone is intentionally minimal so the core interaction is proven. The seams are already there:

- **Real LLM:** add a provider adapter behind `store.createBranch` (one provider first; the adapter pattern keeps others swappable). Keys stay in the user's OS credential store, never in the conversation blob.
- **Documents (PDF first):** PDF.js for viewing + text extraction; retrieve relevant passages as `Content` and branch from them exactly as from answers.
- **Voice:** STT → branch context → TTS, sharing the same branch history as text.
- **Visuals:** React Flow-style structured diagrams whose nodes can themselves become branch anchors.
- **Search & citations:** an adapter that clearly separates document claims, web results, and model inference.

---

## Known limitations

- **Desktop shell:** shipped as a browser app, not an Electron binary (see decision above). Native GUI/Playwright E2E could not run in the build environment.
- **Native selection** is verified by primitives + manual run, not by an automated browser test in this environment.
- **Real LLM requires your key:** the BYOK adapter calls your provider from the browser; answers are only "real" once you add a key in Settings. Calls fail closed to the mock on any error.
- **PDF text extraction** relies on `pdfjs-dist` (worker code-split). Scanned/image-only PDFs won't yield selectable text. Very large PDFs are extracted page-by-page on upload (UI blocks during read).
- **Voice** uses the browser's `speechSynthesis`; availability and voice quality vary by browser/OS.
- **Persistence** uses `localStorage` (per-origin). The API key is stored there (not in the conversation), not in OS credential storage; that's a later-hardening step.
- **Single active document** at a time in the reading view; all uploaded documents remain in the Sources bar and persist across restarts.
- Generated mock answers are generic; they exist to make the branching interaction tangible, not to teach immunology.

---

## License

MIT (provisional). The product name **Branchlight** is provisional; no domain has been purchased and no trademark claim is made.
