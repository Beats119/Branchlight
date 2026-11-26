# Verification report

Date: 2026-11-26. Environment: Linux x64 headless sandbox, Node 22.22.3 / npm 10.9.8. This report replaces the inherited README’s unverified manual-check claims.

## Results

| Check                                 | Result                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Initial inherited suite               | 41 tests passed before changes                                                                 |
| Final `npm test`                      | 88 domain/component/policy/main-process tests pass                                             |
| `SANDBOX_CHROMIUM=1 npm run test:e2e` | 16 Playwright tests pass on the production build                                               |
| `npm run typecheck`                   | Renderer, desktop, configs, test harness and E2E code pass                                     |
| `npm run lint`                        | ESLint + React hook rules pass                                                                 |
| `npm run format:check`                | Prettier passes                                                                                |
| `npm run build`                       | Production UI bundle builds                                                                    |
| `npm run build:desktop`               | Electron TypeScript compiles                                                                   |
| `npm audit`                           | Zero reported vulnerabilities                                                                  |
| Live development server               | Running on 0.0.0.0:5173; preview host permitted                                                |
| Native Electron runtime install       | **Blocked:** `install-electron` failed fetching its runtime under sandbox network restrictions |
| Native desktop GUI / installer        | **Not tested:** no display server, no downloaded Electron binary, no signed/package installer  |

Builds, traces, browser binaries and test scratch output are ignored. `docs/branchlight.png` is an actual browser screenshot, not a rendered design mockup.

## Test-first record

This was an extension of an existing demo, not a greenfield app falsely described as entirely test-first.

1. Inspected source/model/tests/docs, repository cleanliness, OS, Node and available browser/display executables before editing.
2. Ran the baseline suite: 41 passing.
3. Added `regressions.test.ts` and `interaction.test.tsx` before fixes. The first run produced **10 failing tests and 1 passing test**: whitespace anchors, parent version/identity, protected restore/write errors, focus selection, cross-answer selection, frozen drafts and a keyboard passage chooser.
4. Implemented anchor/store fixes; all six initial regression tests passed. Implemented the selection pipeline/picker; all five initial interaction tests passed.
5. Added bounded navigation/source-highlight/parent-return tests; observed **three failures**, then implemented gateways, highlights and parent navigation. All eight interaction tests passed.
6. Added the plain-language suggestion test; it failed because “simply” did not match “simple.” Fixed intent matching. Later added long-selection and specific-memory-cell tests; both failed, then passed after bounded excerpts and a curated response.
7. Added desktop-policy tests before the policy module existed, observed the import failure, then implemented the minimal shell policy and path validation. Those are policy tests, not runtime Electron E2E.
8. Wrote real-browser tests. The first attempt could not start Chromium due to missing Linux NSS libraries. Used the npm-bundled browser’s libraries in ignored cache rather than claiming E2E passed. Native browser tests then exposed a genuine toolbar/scroll race and the “simply” responder issue. Fixed both and reran successfully.
9. Added axe checks; the first run reported insufficient small-text contrast. Darkened muted/subtle tokens and increased small UI text, then passed both themes for reading/composer states.
10. Added protected recovery export/wrong-parent tests; observed two failures, then preserved the raw recovery blob and validated source ownership.
11. Added a viewport-edge placement test. The first assertion was too weak (it passed while overlap remained), so strengthened it to check the toolbar’s full estimated height; verified it failed against the prior implementation and passed after above-selection positioning. This is an estimated-height component check, not exhaustive native geometry coverage.
12. Added a cross-answer explanatory-feedback assertion, observed failure, then implemented the notice. Added overlap, shortcut, export and reset browser regressions; all passed.
13. Final keyboard review added a failing context-heading focus test; implemented focus transfer on navigation without scrolling away from the restored reading position.
14. Formatted/refactored and reran the complete verification commands. Existing render/text assertions were updated to semantic heading queries where the new navigation outline intentionally repeats a question; their behavioral assertions were retained.

## Follow-up hardening pass

After the founder approved continuing, the work stayed on the same tracked branch. No provider, API-key flow, paid service, deployment or speculative future feature was introduced.

- Added protocol tests before the implementation; observed an import failure and two failing new policy tests. Implemented a real local-file handler with explicit MIME types, safe GET/HEAD/error responses, CSP and nosniff. Added binary byte/MIME checks as regression coverage.
- Added eight tests wiring actual `main.ts` to mocked Electron bindings; initially **five failed**, including an unhandled startup rejection. Implemented single-instance handling, primary-window activation, normal-quit storage flushing and startup/renderer error handling. A ninth test then failed for a thrown storage flush, and a tenth failed for the window close-button path; both quit and window close now stop before removing an active renderer and ask the user to export when flushing throws.
- Added two failing UI regressions: keyboard-shortcut cancellation returned focus incorrectly, and an unavailable passage had an enabled but ineffective submit control. Both now pass.
- Added a separate **five-test native Electron suite**, with profile isolation and an offline preflight. Discovery and TypeScript pass. `npm run test:desktop` builds successfully then exits nonzero at preflight because the runtime is missing. **No native test has executed or passed here.** `npm run desktop:install` was retried and still failed under network restrictions; there is also no desktop display.
- Added browser coverage for true backward/forward multiline drag, emoji/Unicode anchors across reload, compact zoom-equivalent CSS layout, and a deliberately injected browser storage write failure with an intact JSON export. These are regression/coverage additions; not every added coverage test initially failed, since some existing behavior was already correct.
- Expanded axe checks to branched, focused, narrow and help states in both themes. All tagged checks pass in the tested states; no screen-reader/high-contrast certification is claimed.
- Current totals: **88 unit/component/protocol/mocked-main tests pass; 16 real-browser tests pass; five native Electron tests remain blocked.** Cross-platform policy test paths were made portable. No Windows/macOS execution is claimed.

Main-process mocks prove listener/response/error wiring, **not** actual Electron behavior. The native setup and result-recording instructions are in [DESKTOP_TESTING.md](DESKTOP_TESTING.md).

## Real-browser coverage

The 16 browser E2E tests exercise:

- Actual pointer dragging over text, including forward/backward multi-paragraph passages, native Selection events and the contextual toolbar.
- Native Unicode/emoji selection with persisted UTF-16 offsets and source highlights after reload.
- First, second, third and fourth-level branch creation, including inside focused answers.
- Source marks, branch ownership within the assistant article, labeled demo answers.
- Focus gateways, full reading width, parent context and root breadcrumbs.
- Collapse/reopen and persisted collapsed state after reload.
- Complete Chromium-process close/relaunch with a persistent profile and restored branch/collapse state.
- Keyboard Tab reachability, paragraph choice, focus containment, Escape cancellation, shortcut submission and duplicate guard.
- Viewports 1440, 1024, 768 and 390 CSS pixels; no document overflow and composer/actions remain inside the viewport.
- Anchor-version corruption keeps the answer, shows an alert, disables source navigation and removes false highlights.
- Exact scroll-position restoration after entering/exiting focus mode in the tested fixed layout.
- Multiple/overlapping anchors, native selection shortcut, source return and exported JSON contents.
- Corrupt saved JSON is not overwritten by dismissing reset; explicit reset replaces it.
- Compact 320x400 CSS layout equivalent to a zoomed viewport, without claiming this is an actual native zoom test.
- An injected browser `Storage.setItem` failure keeps unsaved work usable/exportable; this does not simulate actual disk/quota exhaustion.
- Automated axe WCAG 2 A/AA + 2.1 AA-tagged checks in light/dark reading, composer, branch, focus, narrow and help states. No tagged violations were reported in those states.

All automated tests run with reduced-motion preference. No generic render-only suite is presented as behavioral coverage.

## Acceptance mapping

| #   | Criterion                              | Evidence/status                                                                                |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Launch locally with no key             | Browser launch verified; native desktop launch **pending**                                     |
| 2   | Read sample explanation                | Component + production browser checks                                                          |
| 3–4 | Select answer and ask                  | Native mouse-drag E2E + integrated component flow                                              |
| 5   | Connected branch, not main-chat append | Branch lives in parent answer/article; source marks/quote/navigation; component/E2E assertions |
| 6   | Excerpt, question, mock answer         | Component/E2E checks and screenshot inspection                                                 |
| 7   | Branch inside branch                   | Browser-created nested answers, including focus mode                                           |
| 8   | Three levels readable                  | Four levels exercised; gateways bound inline depth; focused width >600px at laptop viewport    |
| 9   | Collapse/reopen                        | Components, reload and full browser restart                                                    |
| 10  | Return to parent                       | Component + browser focus/breadcrumb checks                                                    |
| 11  | Relationships survive restart          | Serialized store checks + full browser-process restart; **native Electron restart pending**    |
| 12  | Broken anchor detected                 | Unit/component + tampered-version browser test                                                 |
| 13  | Resize usability                       | Four browser viewport widths; screenshots inspected at desktop/mobile                          |
| 14  | Keyboard core actions                  | Keyboard E2E, visible styles, dialog trap and return focus; no screen-reader certification     |
| 15  | Tests/report honest                    | Results and remaining limitations here                                                         |
| 16  | README run/test/demo/limits            | Included                                                                                       |

**Full desktop milestone acceptance is not claimed.** Criteria 1 and 11 are verified for the browser delivery path, not yet for the intended native desktop target.

## Visual inspection performed

Opened actual Chromium screenshots of the initial 1440px reading view, composer, created branch and full-page 390px layout. Corrected a missing-glyph passage icon, small-text contrast, the narrow-screen call-to-action wrapping and an unnecessarily repeated long selected excerpt. These are screenshot inspections, not a claim that a human operated every native gesture.

## Manual checks still required

On a real laptop, record OS/browser/Electron versions and the result, not just a tick mark:

- [ ] Run `npm run desktop:install && npm run desktop`; complete the README’s recursive demo in Electron.
- [ ] Quit **the whole Electron process**, reopen, verify relationships/focus/collapse and source navigation.
- [ ] Try actual trackpad selections (forward/backward, word, sentence, multiple lines, emoji, paragraph-spanning, viewport edges); ensure toolbar is reachable and not covering the source unnecessarily.
- [ ] Try a cross-answer selection and verify the explanatory notice, not a wrongly attached branch.
- [ ] Use the keyboard-only picker, then macOS Command and Windows/Linux Control shortcuts; check native clipboard, zoom and window resizing.
- [ ] Export from Electron and check the native download location/dialog. Verify no remote navigation or popup can open.
- [ ] Test VoiceOver/NVDA, 200% zoom, OS high contrast and actual reduced-motion settings; automated axe tests do not substitute for these.
- [ ] Check Firefox/Safari text selection and browser storage behavior, especially private mode/quota exhaustion. Chromium backward/multiline and emoji dragging now have automated coverage; real trackpad gestures remain manual.
- [ ] Validate save-warning recovery on a real browser quota/permission failure; a throwing storage adapter is covered automatically.
- [ ] Gather student feedback on whether beneath-answer branches preserve the reading flow before choosing a finer-grained paragraph-slot layout.

## Performance scope

No benchmark or “fastest/best stack” claim is made. The test walkthroughs completed without an application exception in the checked main flow. Response generation is synchronous and local; composer text is local component state. Large workspaces, many concurrent windows and thousands of anchors are not performance-tested. The simple whole-state clone/serialization approach should be revisited only with measured needs.
