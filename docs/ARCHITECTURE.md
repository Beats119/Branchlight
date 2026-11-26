# Architecture, security and extension seams

## Why this layout

The source explanation is the primary reading surface. A branch is a connected child panel beneath its owning answer, with the exact source quote, a persistent source mark, and a source-return action. It never becomes a normal main-conversation message. This preserves a simple native-selection text container without mixing interactive branch chrome into the text used to calculate offsets.

Two inline levels are enough to communicate the relationship. The next node is a focus gateway, with no deeper recursive rendering until opened. Full-width focus mode uses the same components and selection pipeline, with ancestor breadcrumbs and a direct parent control. This bounds visual indentation without restricting the domain tree. The right-hand exploration outline is navigation over real branches, not a second set of disconnected features; it disappears at narrower widths.

Composer keystrokes live inside the composer component, not the workspace store. A draft freezes its stable selection independently of the browser’s transient Selection. Native selection can disappear when a textarea gains focus without losing the passage. A synchronous submission ref prevents accidental duplicate writes. No artificial network latency is introduced: local mock generation is synchronous.

## Trust and persistence

1. `StorageLike` hides the actual backend from the engine. Browser localStorage and Electron session localStorage are the first adapters; memory storage supports isolated tests.
2. Load parses untrusted JSON, checks the supported schema, primitive fields, unique content identities and reachable, non-cyclic, singly owned branch topology.
3. Anchor validation then checks identity, content version, offsets, exact text and ownership. Passage mismatches are recoverable; malformed topology is not rendered recursively.
4. Unreadable/unsupported saved data is not overwritten. A temporary session opens with a visible warning; export returns the original blob, and only confirmation-gated reset replaces it.
5. A write failure leaves the in-memory exploration usable but explicitly warns that changes are not saved. No API keys or sensitive credentials are stored.

Limitations: localStorage is synchronous and quota-limited, not encrypted or an OS-backed transactional database. There is no multi-window conflict resolution, import workflow, automatic backup, migration from future schema versions, or key storage. A later desktop repository can implement atomic file writes or SQLite behind a revised repository interface; renderer code should receive only validated domain operations if privileged IPC is then required.

## Electron boundary

The shell deliberately exposes **no preload bridge and no IPC**. This milestone does not need renderer filesystem, process, network or credential capabilities.

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `webviewTag: false`.
- A registered standard, secure `branchlight://app/` origin provides a stable local-storage origin and loads bundled files only.
- The protocol handler serves only the root HTML and flat allowlisted asset names/extensions, using validated filesystem paths and explicit MIME types instead of file-protocol MIME sniffing. GET/HEAD are supported; other methods are rejected. CSP/nosniff headers also cover error responses. Real temporary-filesystem tests cover HTML, JS, CSS, binary bytes, missing files, and encoded slash/backslash attacks.
- CSP restricts scripts/fonts to self, disables connections, frames, objects, forms and base URL changes. Inline styles are permitted for React’s measured positioning; inline scripts and eval are not.
- Production browser HTML receives the same CSP through Vite. Development uses Vite’s normal local server/HMR instead.
- New windows are denied. Main-frame navigation is restricted to the local application. Permission requests/checks are denied.
- Electron’s regular Edit/View menus keep clipboard and zoom controls available without custom renderer privileges.
- The desktop acquires a single-instance lock scoped to its user-data directory. A second invocation restores/focuses the first window instead of creating another writer.
- Normal quit and window close request `session.flushStorageData()` before removing an active renderer. If that call throws, quit is prevented and the user is told to export. This is not a promise of transactional storage or power-loss durability.
- Startup failures are caught and reported rather than leaving a hidden window/unhandled rejection. Unexpected renderer exits show a recovery message; normal quit does not.
- Native E2E can choose a separate absolute profile only when both `BRANCHLIGHT_E2E=1` and `BRANCHLIGHT_TEST_USER_DATA_DIR` are explicitly set in an **unpackaged** run. Packaged apps ignore the override. No renderer API exposes environment variables or test hooks; the native runner checks the effective path before making any UI writes.

**Unverified assumptions:** Electron’s custom-protocol/localStorage behavior, native download dialog for blob exports, menus, native packaging and restart behavior need real Electron execution. This environment compiled the shell, tested actual local-file responses and exercised main-process wiring with mocked Electron bindings, but could not download the runtime or open a GUI. The separate five-test native suite is discoverable/type-checked, not runtime-verified. Do not regard those tests as a security audit. Keep Electron current; inspect upstream advisories and third-party notices before distributing. Do not ship the test harness’s container `--no-sandbox` option.

## Planned evolution — not implemented

| Capability       | Small next seam, after core validation                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real LLM         | One provider adapter consuming selected text, parent context and the question. Separate async request status from immutable completed content. Show provider/model/cost expectations. |
| BYOK             | Separate approved OS-credential design. Never place keys in the conversation JSON, renderer localStorage or chat. Verify platform encryption guarantees before promises.              |
| Documents        | Extract stable, versioned content and source/page metadata first. PDF rendering/selection requires its own anchor adapter; do not assume one DOM Range describes it.                  |
| Voice            | Text transcript and speech use the same branch context; audio storage/lifecycles are separate attachments.                                                                            |
| Diagrams/notes   | Add typed attachments referencing stable content/branch IDs; preserve text anchors. Avoid installing diagram/editor libraries until approved.                                         |
| Search/citations | Track source provenance and distinguish retrieved claims from model inference. A link is not evidence of verification.                                                                |
| Managed sync     | Introduce authenticated storage and explicit merge/conflict behavior only when approved. Preserve local/BYOK mode.                                                                    |

No generic plugin registry, server, ORM, vector database, provider SDK or attachment infrastructure was added in anticipation of these features.

## Official references checked

Access was restricted to GitHub/npm/package registries. These official source files or npm package metadata were actually retrieved, not inferred from inaccessible websites:

- [Electron security guidance](https://github.com/electron/electron/blob/main/docs/tutorial/security.md): current framework, sandboxing/isolation, restricted navigation, minimal privileges, trusted local content.
- [Electron app API](https://github.com/electron/electron/blob/main/docs/api/app.md) and [session API](https://github.com/electron/electron/blob/main/docs/api/session.md): single-instance/user-data behavior and DOM-storage flushing were checked during the hardening pass.
- [Electron npm package](https://www.npmjs.com/package/electron): version 45.5.0, MIT, Node >=22.12.0, explicit `install-electron` command in the installed package.
- [Vite getting started](https://github.com/vitejs/vite/blob/main/docs/guide/index.md) and [MIT license](https://github.com/vitejs/vite/blob/main/LICENSE); npm engine metadata checked against this environment.
- [React MIT license](https://github.com/facebook/react/blob/main/LICENSE). Existing React 18 was retained rather than unnecessarily migrating the application runtime.
- [Playwright Apache-2.0 license](https://github.com/microsoft/playwright/blob/main/LICENSE); npm metadata for Playwright 1.65.1.
- npm metadata for Vitest 5.1.2, Vite 8.3.8 and React plugin 6.3.0 (MIT; compatible with Node 22.12+), plus the optional test-only `@sparticuz/chromium` runtime (MIT package; Chromium carries its own notices).

Versions are exact in package.json and transitive resolutions are locked in package-lock.json. `npm audit` reported zero known vulnerabilities on the final run; that is not proof that no vulnerabilities exist. An inherited five-finding audit was resolved by updating tooling instead of suppressing the audit.
