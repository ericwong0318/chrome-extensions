# Zhihu User Blocker

A Chrome extension (Manifest V3) that lets you block users on Zhihu by hiding all their posts, inspired by [ytblock](https://github.com/ytblocker/ytblock). When a blocked user is detected in your feed, their content is hidden and a control is injected next to their name so you can block/unblock/lock/unlock them.

## Features

- **Inline blocking UI** — a `Block` button is portaled right after each detected Zhihu user link (`.UserLink-link` inside `.AuthorInfo-head`).
- **Content hiding** — blocked users' list items are hidden (`display:none`).
- **Toggle controls** — `Block` → `Unlock` (reveal) → `Lock` (re-hide) → `Unblock` (remove from storage).
- **Options page** — view, unblock individually, or clear all blocked users.
- **Shadow DOM isolation** — the extension mounts into `#my-extension-root` with its own shadow root so its styles don't leak into the page.
- **Service worker message hub** — the background script handles `blockUser`, `unblockUser`, `getBlockedUsers`, and `factCheck` messages and persists to `chrome.storage.sync`.
- **AI Fact Check** — a "Fact Check" button is injected right next to the **Block** button on each answer/question. Clicking it sends the text to an AI provider (configured in Options) and shows a structured analysis: **Validity vs. Truth**, **Ethos / Pathos / Logos**, and **informal fallacies**, plus a verdict (Credible / Misleading / Unverified). You can choose the reply language (简体中文 / 繁體中文 / English) in Options.



## Tech Stack


| Concern                  | Tooling                              |
| ------------------------ | ------------------------------------ |
| Build / bundling         | Vite 5 + `@crxjs/vite-plugin` (beta) |
| UI                       | React 18, MUI 5, Emotion             |
| Unit / integration tests | Vitest 2 + Testing Library (jsdom)   |
| End-to-end tests         | Playwright 1.61 (Chromium)           |
| Language                 | TypeScript 5                         |




## How to Use



### Install (load unpacked)

The extension is built as a standard MV3 unpacked extension. You do not need a Chrome Web Store listing to use it locally.

1. Build the extension:
  ```bash
   npm install
   npm run build
  ```
   This outputs the unpacked extension to the `dist/` folder.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` directory.
5. The extension icon appears in the toolbar. Visit Zhihu — when a user link (`.UserLink-link` inside `.AuthorInfo-head`) is detected in your feed, a **Block** button is injected next to the name.



### Blocking / unblocking

- **Block** — hides that user's posts and adds them to `chrome.storage.sync`.
- **Unlock** — temporarily reveal a blocked user's content without removing the block.
- **Lock** — re-hide a previously unlocked user.
- **Unblock** — remove the user from storage entirely (content stays visible).
- **Options page** — click the toolbar icon (or right-click → Options) to view all blocked users, unblock them individually, or **Clear all**.

> Blocked users are stored under the `zhihuBlockedUsers` key in `chrome.storage.sync`, so they sync across Chrome profiles/devices where you're signed in.



### Development

```bash
npm run dev        # development build (vite --mode development)
npm run preview    # preview the built extension
npm test           # run unit/integration tests once
npm run test:watch # run tests in watch mode
```



## Project Structure

```
manifest.json              # MV3 manifest (permissions, content scripts, options page)
vite.config.ts             # CRX/Vite build config
vitest.config.ts           # Vitest config (jsdom, setup file)
playwright.config.js       # Playwright config (loads unpacked dist/ extension)
src/
  background.ts            # Service worker: message handler + action click
  content.tsx             # Content script: mounts shadow root + Blocker
  blocker/Blocker.tsx     # Inline block/unblock/lock/unlock controls
  logger.ts               # Error/warning/info logging to chrome.storage.local
  options/index.tsx       # Options page entry (mounts Options UI)
  options/Options.tsx     # Options page UI
  test/setup.ts           # Shared chrome.storage mock + jest-dom
e2e/
  extension.spec.ts       # Real-extension E2E smoke test
  server.mjs              # Local fixture server (http://127.0.0.1:8777)
  fixtures/index.html     # Zhihu-like fixture page
```



## Scripts


| Command              | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `npm run build`      | Production build (outputs to `dist/`).                     |
| `npm run dev`        | Development build (`vite --mode development`).             |
| `npm run preview`    | Preview the built extension.                               |
| `npm test`           | Run all Vitest unit/integration tests once (`vitest run`). |
| `npm run test:watch` | Run Vitest in watch mode.                                  |


> **E2E note:** Playwright tests require a built extension. Run `npm run build` first, then `npx playwright test`. The test loads `dist/` as an unpacked extension and serves a local fixture, so it runs fully offline.



## Architecture & Data Contract

Blocked users are stored in `chrome.storage.sync` under the key `zhihuBlockedUsers` as an array of `{ id, name }` objects (the user `id` is the profile path, e.g. `/people/alice`).

The background service worker listens for `chrome.runtime.onMessage` and supports:


| Action            | Payload                | Response                            |
| ----------------- | ---------------------- | ----------------------------------- |
| `blockUser`       | `{ userId, userName }` | `{ success: true }` (dedupes by id) |
| `unblockUser`     | `{ userId }`           | `{ success: true }`                 |
| `getBlockedUsers` | —                      | `{ users: [{ id, name }] }`         |
| `factCheck`       | `{ text }`             | `{ result: FactCheckResult }` or `{ disabled: true }` or `{ error }` |
| (unknown)         | —                      | `undefined`                         |


Clicking the toolbar action (`action.onClicked`) opens the options page via `chrome.runtime.openOptionsPage`.

---

## Fact Check (AI)

The extension can send any Zhihu answer or question to an AI provider for a structured critical-thinking analysis. The feature is **online only** — there is no local/offline analysis.

### How it works
 1. On each answer/question body (`.RichText`, `.ContentItem-title`, `.AnswerCard`, `.QuestionAnswer-content`), a **Fact Check** button is injected inline right next to the **Block** button (the block controls container). Collapsed answers that match several selectors collapse into a single button, so there is never more than one Fact Check button per answer.
2. Clicking it messages the background service worker (`action: 'factCheck'`), which reads the provider config from `chrome.storage.sync` (`factCheckConfig`) and calls the provider. **The API key never reaches the content script** — only the background worker sees it.
3. The provider returns a structured analysis that the popover renders:
   - **Formal Logic — Validity vs. Truth**: is the reasoning structurally sound, and are the premises actually true?
   - **Rhetoric — Ethos / Pathos / Logos**: credibility, emotion, and logical appeals used.
   - **Informal Fallacies**: any detected fallacies (ad hominem, straw man, false dilemma, appeal to emotion, etc.) with the quoted span.
   - **Verdict**: Credible / Misleading / Unverified.

### Providers (configured in Options → "Fact Check (AI)")
| Provider | Key needed? | Notes |
| -------- | ----------- | ----- |
| **Claude** (Anthropic) | Yes | Calls `https://api.anthropic.com/v1/messages`. |
| **Local** (Ollama / Qwen / llama.cpp) | No (free) | OpenAI-compatible `/v1/chat/completions` at a configurable base URL (default `http://localhost:11434/v1`). Run a local model for free, private analysis. |
| **Gemini** (Google) | Yes | Calls `generativelanguage.googleapis.com`. |
| **OpenAI** | Yes | Calls `https://api.openai.com/v1/chat/completions`. |
| **DeepSeek** | Yes | Calls `https://api.deepseek.com/v1/chat/completions`. |
| **OpenRouter** | Yes | Calls `https://openrouter.ai/api/v1` (OpenAI-compatible; access many models via one key). |
| **Other** (OpenAI-compatible) | Optional | Custom base URL + model (e.g. a self-hosted LangGraph agent endpoint). |

If no provider is selected, the Fact Check button is disabled with a tooltip pointing to Options.

### Reply language

In Options → "Fact Check (AI)" you can pick the language the AI should reply in:

| Language setting | Value sent to the model |
| ---------------- | ----------------------- |
| 中文（简体）      | `zh-CN`                 |
| 中文（繁體）      | `zh-TW`                 |
| English          | `en` (default)          |

The chosen language is appended as an instruction to the prompt so the analysis is returned in that language.

> **Note on agents / LangGraph:** agent orchestration (multi-step planning, tool use) belongs in a **backend** service, not the extension. Point the **Other** provider at your own hosted endpoint (e.g. a Cloudflare Worker or server running LangGraph) to get agentic behavior while keeping the extension thin.

---



## Test Cases

There are **47 test cases across 6 files**: 46 Vitest unit/integration tests and 1 Playwright end-to-end test.

### `src/background.test.ts` — Background Script (6 tests)

Tests the `chrome.runtime.onMessage` handler in isolation with a mocked `chrome` API.


| Test                                                                  | What it verifies                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| blockUser adds a new user without duplicates                          | Blocks a user → `sendResponse({success:true})`; re-blocking the same user keeps the stored list at length 1. |
| unblockUser removes the user                                          | Block then unblock → stored list is empty.                                                                   |
| getBlockedUsers returns the current list                              | Block then query → response is `{ users: [{ id, name }] }`.                                                  |
| returns undefined for unknown actions                                 | Dispatching an unrecognized action returns `undefined`.                                                      |
| registers an action.onClicked listener that opens the options page    | Listener registered exactly once; invoking it calls `openOptionsPage`.                                       |
| round-trips a blockUser message from a content script and persists it | Simulates a content-script message → user is persisted to storage.                                           |




### `src/content.test.tsx` — Content Script (2 tests)

Integration tests that import `content.tsx` and inspect the live DOM.


| Test                                                           | What it verifies                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| mounts the extension root with a Shadow DOM into the page body | `#my-extension-root` is created as a child of `body` with a non-null `shadowRoot`. |
| does not mount a second root on repeated execution             | Re-importing the module does not create a duplicate root.                          |




### `src/blocker/Blocker.test.tsx` — Blocker Component (6 tests)

Renders `<Blocker />` against a seeded fake Zhihu DOM (`.UserLink-link` inside `.AuthorInfo-head`).


| Test                                                    | What it verifies                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| renders a Block button next to the detected user name   | A `Block` button is portaled immediately after the user link.                                    |
| blocks a user: hides content and persists to storage    | Clicking Block sets `display:none` on the list item and stores the user (`id: '/people/alice'`). |
| unlock reveals content, lock re-hides it                | Unlock → content shown; Lock → content hidden again.                                             |
| unblock removes the user from storage and shows content | Clicking Unblock clears storage and reveals content.                                             |
| renders a Fact Check button next to the Block button    | A `Fact Check` button is portaled into the same inline container as the Block controls.          |
| renders exactly one Fact Check button for a collapsed answer with multiple matching content selectors | A collapsed answer matching `.ContentItem-title` + `.RichText` + `.AnswerCard` yields exactly one Fact Check button. |




### `src/options/Options.test.tsx` — Options Page (8 tests)

Unit tests for the options UI against a mocked `chrome.storage`.


| Test                                           | What it verifies                                       |
| ---------------------------------------------- | ------------------------------------------------------ |
| shows empty state when no users are blocked    | Displays "No users blocked."                           |
| lists blocked users with name and id           | Renders the name and id of a blocked user.             |
| unblock removes a user and persists the change | Clicking Unblock empties the list and updates storage. |
| clear all empties the block list               | Clicking "Clear all" removes all users and persists.   |
| fact-check provider config is loaded and saved | Provider/apiKey/baseUrl/model persist to `factCheckConfig`. |
| fact-check language setting is loaded and saved | The reply-language select persists to `factCheckConfig.language`. |
| disabling fact check hides the provider fields | Toggling fact check off hides provider inputs.         |
| fact check button disabled when no provider    | Options reflects the disabled state when no provider is set. |




### `src/logger.test.ts` — Logger (4 tests)

Unit tests for the error/warning/info logger that persists to `chrome.storage.local`.

| Test                                           | What it verifies                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| stores an error log entry in chrome.storage.local | `logError` writes one entry (level `error`, message, context, timestamp). |
| records warn and info levels                   | `logWarn`/`logInfo` persist with the correct levels.                  |
| clears all logs                              | `clearLogs` empties the stored log list.                              |
| caps stored entries at 200 (newest kept)    | After 250 writes, only the 200 newest entries remain.                  |

### `e2e/extension.spec.ts` — End-to-End (1 test)

Playwright test running the **real** extension against a local Zhihu-like fixture served at `http://127.0.0.1:8777` (matched by the `http://127.0.0.1/`* content-script rule).


| Test                                                                               | What it verifies                                                                                               |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| extension mounts #my-extension-root and injects a Block button next to a user name | Shadow-DOM root exists (count 1, has `shadowRoot`); exactly 2 `Block` buttons are injected next to user links. |


---



## Test Setup Notes

- **Vitest** runs in `jsdom` with `src/test/setup.ts` as the setup file. The setup file:
  - Imports `@testing-library/jest-dom` matchers.
  - Provides a shared `mockChromeStorage` (an in-memory `chrome.storage.sync` mock) and resets it before each test.
- **Playwright** loads the unpacked `dist/` extension into Chromium and serves the fixture via `e2e/server.mjs`. It runs offline and exercises the actual content script, not a mock.

---



## CI/CD Pipeline

This repo uses two GitHub Actions workflows under `.github/workflows/`.

### CI — `.github/workflows/ci.yml`


|             |                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger** | Push to `main`, and any pull request targeting `main`                                                                                                                                                               |
| **Runner**  | `ubuntu-latest` (host) running the `node:24-bookworm-slim` container                                                                                                                                                |
| **Steps**   | 1. Checkout (`actions/checkout@v7`) 2. Cache npm (`~/.npm`, keyed on `package-lock.json`) 3. `npm ci` 4. `npm test` (Vitest) 5. `npm run build` (Vite → `dist/`) 6. Upload `dist/` as the `extension-dist` artifact (`actions/upload-artifact@v7`) |


Purpose: catch broken tests/builds before they reach `main`. Every PR shows a green/red check.

### Release — `.github/workflows/release.yml`


|                 |                                                                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**     | Push of any tag matching `v`* (e.g. `v1.0.0`)                                                                                                                                                                                                                                    |
| **Permissions** | `contents: write` (needed to create the GitHub Release)                                                                                                                                                                                                                          |
| **Runner**      | `ubuntu-latest` (host) running the `node:24-bookworm-slim` container                                                                                                                                                                                                             |
| **Steps**       | 1. Checkout (`actions/checkout@v7`) 2. Cache npm (`actions/cache@v6`) 3. `npm ci` 4. `npm test` 5. `npm run build` 6. `apt-get install zip` (slim image has no `zip`) 7. Zip `dist/` → `zhihu-user-blocker-<tag>.zip` 8. Create GitHub Release with the zip attached (`softprops/action-gh-release@v3`, auto-generated notes) |


Purpose: produce a versioned, downloadable extension package and a GitHub Release whenever a `v*` tag is pushed.

### How to cut a release

This project uses [Release Please](https://github.com/googleapis/release-please) to automate releases entirely in CI. It reads [Conventional Commits](https://www.conventionalcommits.org/) on `main`, maintains a running release PR that bumps `package.json` **and** `manifest.json` together (plus `CHANGELOG.md`), and — when that PR is merged — creates the GitHub Release and `v*` tag. The tag then triggers the build/publish workflow below.

**Versioning rule (for agents and humans):**
- `fix:` commit → patch bump (`v1.2.x`)
- `feat:` commit → minor bump (`v1.x.0`)
- `BREAKING CHANGE:` in commit body → major bump (`vX.0.0`)

To release:

1. Merge feature/fix PRs to `main` using conventional commit messages.
2. Release Please automatically keeps a **"release PR"** up to date with the pending version bump and changelog.
3. **Merge the release PR.** This creates the `vX.Y.Z` tag and the GitHub Release.
4. The tag push triggers the Release workflow (`.github/workflows/release.yml`), which builds and attaches the `zhihu-user-blocker-<tag>.zip` to the release.

No local version-bumping commands are needed — an AI coding agent just needs to write conventional-commit messages; Release Please handles the rest.

> The Release workflow also re-syncs `manifest.json` from `package.json` before building, as a safety net against version drift.

> **Note on images:** both workflows run inside `node:24-bookworm-slim` — a lightweight (~150–200 MB) Debian-based image. It ships no `zip`, so the Release job installs it via `apt-get` before packaging. The outer `ubuntu-latest` runner is GitHub's standard hosted Linux image and hosts the container; its size is fixed and not something you tune via image choice.

