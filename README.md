# Zhihu User Blocker

A Chrome extension (Manifest V3) that lets you block users on Zhihu by hiding all their posts, inspired by [ytblock](https://github.com/ytblocker/ytblock). When a blocked user is detected in your feed, their content is hidden and a control is injected next to their name so you can block/unblock/lock/unlock them.

## Features

- **Inline blocking UI** — a `Block` button is portaled right after each detected Zhihu user link (`.UserLink-link` inside `.AuthorInfo-head`).
- **Content hiding** — blocked users' list items are hidden (`display:none`).
- **Toggle controls** — `Block` → `Unlock` (reveal) → `Lock` (re-hide) → `Unblock` (remove from storage).
- **Options page** — view, unblock individually, or clear all blocked users.
- **Shadow DOM isolation** — the extension mounts into `#my-extension-root` with its own shadow root so its styles don't leak into the page.
- **Service worker message hub** — the background script handles `blockUser`, `unblockUser`, and `getBlockedUsers` messages and persists to `chrome.storage.sync`.

## Tech Stack

| Concern | Tooling |
| --- | --- |
| Build / bundling | Vite 5 + `@crxjs/vite-plugin` (beta) |
| UI | React 18, MUI 5, Emotion |
| Unit / integration tests | Vitest 2 + Testing Library (jsdom) |
| End-to-end tests | Playwright 1.61 (Chromium) |
| Language | TypeScript 5 |

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
  content.tsx             # Content script: mounts shadow root + overlay
  overlay/Overlay.tsx     # Inline block/unblock/lock/unlock controls
  options/Options.tsx     # Options page UI
  test/setup.ts           # Shared chrome.storage mock + jest-dom
e2e/
  extension.spec.ts       # Real-extension E2E smoke test
  server.mjs              # Local fixture server (http://127.0.0.1:8777)
  fixtures/index.html     # Zhihu-like fixture page
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Production build (outputs to `dist/`). |
| `npm run dev` | Development build (`vite --mode development`). |
| `npm run preview` | Preview the built extension. |
| `npm test` | Run all Vitest unit/integration tests once (`vitest run`). |
| `npm run test:watch` | Run Vitest in watch mode. |

> **E2E note:** Playwright tests require a built extension. Run `npm run build` first, then `npx playwright test`. The test loads `dist/` as an unpacked extension and serves a local fixture, so it runs fully offline.

## Architecture & Data Contract

Blocked users are stored in `chrome.storage.sync` under the key **`zhihuBlockedUsers`** as an array of `{ id, name }` objects (the user `id` is the profile path, e.g. `/people/alice`).

The background service worker listens for `chrome.runtime.onMessage` and supports:

| Action | Payload | Response |
| --- | --- | --- |
| `blockUser` | `{ userId, userName }` | `{ success: true }` (dedupes by id) |
| `unblockUser` | `{ userId }` | `{ success: true }` |
| `getBlockedUsers` | — | `{ users: [{ id, name }] }` |
| (unknown) | — | `undefined` |

Clicking the toolbar action (`action.onClicked`) opens the options page via `chrome.runtime.openOptionsPage`.

---

## Test Cases

There are **17 test cases across 5 files**: 16 Vitest unit/integration tests and 1 Playwright end-to-end test.

### `src/background.test.ts` — Background Script (6 tests)
Tests the `chrome.runtime.onMessage` handler in isolation with a mocked `chrome` API.

| Test | What it verifies |
| --- | --- |
| blockUser adds a new user without duplicates | Blocks a user → `sendResponse({success:true})`; re-blocking the same user keeps the stored list at length 1. |
| unblockUser removes the user | Block then unblock → stored list is empty. |
| getBlockedUsers returns the current list | Block then query → response is `{ users: [{ id, name }] }`. |
| returns undefined for unknown actions | Dispatching an unrecognized action returns `undefined`. |
| registers an action.onClicked listener that opens the options page | Listener registered exactly once; invoking it calls `openOptionsPage`. |
| round-trips a blockUser message from a content script and persists it | Simulates a content-script message → user is persisted to storage. |

### `src/content.test.tsx` — Content Script (2 tests)
Integration tests that import `content.tsx` and inspect the live DOM.

| Test | What it verifies |
| --- | --- |
| mounts the extension root with a Shadow DOM into the page body | `#my-extension-root` is created as a child of `body` with a non-null `shadowRoot`. |
| does not mount a second root on repeated execution | Re-importing the module does not create a duplicate root. |

### `src/overlay/Overlay.test.tsx` — Overlay Component (4 tests)
Renders `<Overlay />` against a seeded fake Zhihu DOM (`.UserLink-link` inside `.AuthorInfo-head`).

| Test | What it verifies |
| --- | --- |
| renders a Block button next to the detected user name | A `Block` button is portaled immediately after the user link. |
| blocks a user: hides content and persists to storage | Clicking Block sets `display:none` on the list item and stores the user (`id: '/people/alice'`). |
| unlock reveals content, lock re-hides it | Unlock → content shown; Lock → content hidden again. |
| unblock removes the user from storage and shows content | Clicking Unblock clears storage and reveals content. |

### `src/options/Options.test.tsx` — Options Page (4 tests)
Unit tests for the options UI against a mocked `chrome.storage`.

| Test | What it verifies |
| --- | --- |
| shows empty state when no users are blocked | Displays "No users blocked." |
| lists blocked users with name and id | Renders the name and id of a blocked user. |
| unblock removes a user and persists the change | Clicking Unblock empties the list and updates storage. |
| clear all empties the block list | Clicking "Clear all" removes all users and persists. |

### `e2e/extension.spec.ts` — End-to-End (1 test)
Playwright test running the **real** extension against a local Zhihu-like fixture served at `http://127.0.0.1:8777` (matched by the `http://127.0.0.1/*` content-script rule).

| Test | What it verifies |
| --- | --- |
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

| | |
| --- | --- |
| **Trigger** | Push to `main`, and any pull request targeting `main` |
| **Runner** | `ubuntu-latest` (host) running the `node:20-bookworm-slim` container |
| **Steps** | 1. Checkout (`actions/checkout@v4`)<br>2. Cache npm (`~/.npm`, keyed on `package-lock.json`)<br>3. `npm ci`<br>4. `npm test` (Vitest)<br>5. `npm run build` (Vite → `dist/`)<br>6. Upload `dist/` as the `extension-dist` artifact |

Purpose: catch broken tests/builds before they reach `main`. Every PR shows a green/red check.

### Release — `.github/workflows/release.yml`

| | |
| --- | --- |
| **Trigger** | Push of any tag matching `v*` (e.g. `v1.0.0`) |
| **Permissions** | `contents: write` (needed to create the GitHub Release) |
| **Runner** | `ubuntu-latest` (host) running the `node:20-bookworm-slim` container |
| **Steps** | 1. Checkout<br>2. Cache npm<br>3. `npm ci`<br>4. `npm test`<br>5. `npm run build`<br>6. `apt-get install zip` (slim image has no `zip`)<br>7. Zip `dist/` → `zhihu-user-blocker-<tag>.zip`<br>8. Create GitHub Release with the zip attached (`softprops/action-gh-release@v2`, auto-generated notes) |

Purpose: produce a versioned, downloadable extension package and a GitHub Release whenever a `v*` tag is pushed.

### How to cut a release

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The tag push triggers the Release workflow automatically. The resulting zip is attached to the release at `https://github.com/ericwong0318/chrome-extensions/releases/tag/v1.0.0`.

> **Note on images:** both workflows run inside `node:20-bookworm-slim` — a lightweight (~150–200 MB) Debian-based image. It ships no `zip`, so the Release job installs it via `apt-get` before packaging. The outer `ubuntu-latest` runner is GitHub's standard hosted Linux image and hosts the container; its size is fixed and not something you tune via image choice.
