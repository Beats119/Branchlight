# Branchlight

> **Follow every question.**

Branchlight is a reading companion where **any passage inside an AI explanation can become its own in-place conversation** — and any passage inside *that* conversation can become another. Instead of a linear chat that dumps answers at the bottom, Branchlight lets you branch directly from the sentence you don't understand, collapse the digression when you're done, and keep reading.

This repository contains **Milestone 1** of the product: a polished, local, runnable prototype powered entirely by **mock responses**. No API key, no GPU, no backend, no network.

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

## What this milestone includes

- A polished, reading-focused UI (light + dark themes, full keyboard operability, reduced-motion support).
- A sample conversation with a substantial, multi-paragraph AI answer.
- Select-to-ask branching anchored to the exact selected text.
- **Nested branching** (verified to 5+ levels with no hard-coded maximum).
- Collapse / expand and a **focus view** with breadcrumbs for deep branches.
- A mock responder that is clearly labeled as a demo answer.
- **Local persistence** of branches, anchors, and collapse/focus state across restarts.
- **Anchor validation on load** so a branch can never silently point at the wrong passage.
- A test suite (domain + component) built test-first around the behavior.

### Explicitly out of scope (per the milestone)

No PDF parsing, no real LLM calls, no voice, no web search, no accounts, no cloud sync, no diagram generation. The architecture leaves clean extension points for these, but adds no speculative infrastructure.

---

## Tech stack & key decisions

| Concern | Choice | Why |
| --- | --- | --- |
| Language / UI | **TypeScript + React 18** | Mature, types catch anchor/offset mistakes early. |
| Build / dev | **Vite 5** | Fast, simple, standard. |
| Tests | **Vitest 2 + Testing Library (jsdom)** | Fast unit + component testing in one runner. |
| Persistence | **`StorageLike` repository** (localStorage in browser, in-memory in tests) | Decouples the domain from any backend; can migrate to SQLite / Electron `safeStorage` later. |
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
    AppShell.tsx          # app bar, brand, theme toggle, reset
    ConversationView.tsx  # the reading column
    MessageView.tsx       # user + assistant messages
    BranchableText.tsx    # renders Content as selectable text with inline highlight + comment marker + popover thread (recursive for nesting)
    SelectionProvider.tsx # owns live selection, renders overlay, creates branches
    SelectionOverlay.tsx  # floating toolbar + composer
    FocusView.tsx         # breadcrumbed full-width branch view
    Breadcrumbs.tsx
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
- **Persistence** uses `localStorage` (per-origin). It is not encrypted; real key storage would move to OS credential storage in a later milestone.
- **Single conversation / single document** in the demo. Multi-doc workspaces are future scope.
- Generated mock answers are generic; they exist to make the branching interaction tangible, not to teach immunology.

---

## License

MIT (provisional). The product name **Branchlight** is provisional; no domain has been purchased and no trademark claim is made.
