# Native desktop verification

The shell now has a separate native Electron test suite. **It has not run in the build sandbox.** The Electron binary download is blocked and no graphical display is installed. Do not treat a successful TypeScript build, mocked-main test, or discovered test list as a successful native launch.

## Run on a laptop

Use Node 22.12+ and a normal, non-administrator desktop terminal in the repository folder:

```bash
npm ci
npm run desktop:install
npm run test:desktop:list
npm run test:desktop
```

`desktop:install` downloads the free Electron runtime. The test command builds production UI and main-process code, then launches Electron—**not** a browser standing in for Electron. It needs no Vite server, API key or paid service. Its preflight checks for the installed binary without triggering Electron's lazy download; use the explicit install command if needed.

On Linux, standard Electron libraries and a display are required. If using an already configured headless Linux machine with Xvfb installed:

```bash
xvfb-run -a npm run test:desktop
```

Do not add `--no-sandbox` or turn off renderer security just to get green results. OS/package installation may need administrator approval. No hosted CI workflow or paid runner was introduced; these commands run locally.

To open the app normally:

```bash
npm run desktop
```

## Five native scenarios

1. **Startup and boundaries:** bundled `branchlight://app/` UI renders; the renderer does not expose Node's `require` or `process`; normal copy/zoom menu roles exist. OS sandbox metrics are asserted where Electron exposes them (Windows/macOS); Linux does not expose that metric.
2. **Branch/restart:** native pointer selection creates a branch; two further levels open focus mode. After collapse, the whole app quits and reopens against the same isolated profile; answers, source marks, relationships and focused/collapsed state must return.
3. **Navigation:** a popup and external link attempt do not create another window, replace the local app, or issue an HTTP request in the observed page.
4. **Export:** a created question appears in exported JSON. The test runner chooses a temporary destination via Electron's download event; this is **not a test of the OS Save dialog**.
5. **Window/zoom:** native window content size and `webContents.setZoomFactor(2)` exercise actual Electron zoom. The composer can scroll to its submit/cancel controls without horizontal document overflow.

A failing scenario is a failure to investigate; it must not be changed to `test.skip()` merely to make a report green. The suite is authored/type-checked/discovered here, but runtime-specific corrections may still be necessary after its first real execution.

## Data isolation

Each scenario uses a unique `test-results/desktop/.../profile` folder. The restart scenario intentionally reuses only its own profile. The runner verifies `app.getPath('userData')` matches the requested isolated path **before** performing any UI writes, and closes the launched app on setup failure.

The shell accepts the profile override only in an unpackaged run with explicit `BRANCHLIGHT_E2E=1` opt-in and an absolute `BRANCHLIGHT_TEST_USER_DATA_DIR`. A packaged app ignores it. Tests do not reset or migrate the founder's real workspace and do not modify the system clipboard. Generated profiles/reports/downloads are Git-ignored. The suite does not expose test-only renderer privileges or IPC.

Single-instance locking is scoped to the chosen profile. A normal second application invocation should restore the already open window. The mocked-main suite verifies the wiring; confirm actual OS behavior manually below.

## Save and failure behavior

The renderer still uses localStorage; no database, preload API, encryption or key storage was added. On a normal native quit or window close, the shell asks Electron to flush pending DOMStorage. If that synchronous call throws, the app prevents quit and asks the user to export. This is a tested error path with mocked Electron, **not** an assurance of atomic disk writes or survival of power loss/forced kill.

Startup errors now show an actionable rebuild message. Unexpected renderer exits show a recovery message, while a normal quit does not trigger a false crash alert. Do not reset the workspace to fix an install/build error.

## Result record — fill in after actually running

| Field                                                   | Recorded result                       |
| ------------------------------------------------------- | ------------------------------------- |
| OS / CPU / display                                      | Pending                               |
| Node / npm / Electron version                           | Pending                               |
| `npm run test:desktop`                                  | Blocked in sandbox; pending on laptop |
| Native startup / no Node renderer access                | Pending                               |
| Full quit/relaunch / branch persistence                 | Pending                               |
| Native export destination / file contents               | Pending                               |
| Native 200% zoom / resize                               | Pending                               |
| Second normal invocation focuses existing app           | Pending manual OS check               |
| Native Save dialog, clipboard and platform shortcuts    | Pending manual OS check               |
| VoiceOver / NVDA / OS high contrast / physical trackpad | Pending human check                   |

Attach the command output and failing test name if anything fails. Browser E2E and mocked-main results belong in separate rows—they cannot be substituted for native evidence. Signed installers, updates, macOS notarization and Windows signing remain out of scope until this local target is verified and distribution is approved.
