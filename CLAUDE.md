# 🏃‍♂️ CLAUDE.md: Zhihu User Blocker (MV3)

> **This file is the canonical source of truth for project rules.** If you switch AI tools, point the new tool at this file (or `DEVELOPER.md`). The Claude-specific `.clinerules` is just a thin shim that points here.

This is a **Manifest V3 Chrome Extension** built with **Vite**, **React**, **MUI 5 + Emotion**, and **TypeScript (strict)**. It blocks users on Zhihu and adds AI-powered fact-checking.

## 🚀 Execution & Verification Commands

Run these before considering any task done or making a commit:

* **Production Build:** `npm run build` → outputs to `dist/`
* **Local Hot Reload:** `npm run dev`
* **Preview Built Extension:** `npm run preview`
* **Type Safety Check:** `npx tsc --noEmit`
* **Run Unit Tests (all):** `npm test`  *(alias for `vitest run`)*
* **Run a Single Test File:** `npm test -- path/to/file.test.ts`
* **Watch Mode:** `npm run test:watch`
* **E2E Tests (Playwright):** `npx playwright test` — **run `npm run build` first**

> Linting/formatting uses ESLint + Prettier configs (no `npm run lint` script yet — run via your editor or `npx eslint`).

## 📐 Project Structure & Map

* `manifest.json` — Extension config (MV3, permissions, content/background/options registration).
* `vite.config.ts` — Vite + `@crxjs/vite-plugin` build config.
* `src/background.ts` — MV3 Service Worker: message passing, `chrome.storage` handling, fact-check orchestration.
* `src/content.tsx` — Injected content script entry (DOM observation, UI overlay via React).
* `src/blocker/Blocker.tsx` — Block UI component.
* `src/options/Options.tsx` — Options page (settings, blocked-user management, provider config).
* `src/factcheck/` — AI fact-check pipeline (`FactCheck.tsx`, `pipeline.ts`, `providers.ts`, `agents/`).
* `src/logger.ts` — Logging utility (writes to `chrome.storage.local`).
* `e2e/` — Playwright E2E specs (`extension.spec.ts`, `server.mjs`, fixtures).

## 🎨 Code Style & Conventions

* **TypeScript:** Strict mode required. No implicit `any`. Define interfaces/types alongside utility modules.
* **React:** Functional components + hooks only.
* **UI:** MUI 5 + Emotion (`@emotion/react`, `@emotion/styled`).
* **Imports order:** external deps → internal utils → component styles.
* **Naming:**
  * Files/folders: `kebab-case` (e.g. `Blocker.tsx`, `callProviders.ts`)
  * Components: `PascalCase`
  * Variables/functions: `camelCase`
* **Content scripts:** No direct DOM manipulation — render via React (portals/overlays).
* **Background scripts:** Service worker using message passing only (no DOM access).
* **Storage rules:**
  * `chrome.storage.sync` → user data (blocked users `zhihuBlockedUsers`, `factCheckConfigs`).
  * `chrome.storage.local` → logs and cached data.
* **Permissions:** Request only the minimal necessary scope.
* **File patterns:**
  * `*.tsx` React components, `*.test.tsx` component tests, `*.ts` utilities/types.
  * `*.test.ts` unit tests, `*.spec.ts` E2E tests, `setup.ts` test config.
  * Configs: `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `manifest.json`.
* **JSDoc:** Public APIs must have JSDoc comments.
* **Performance:** Lazy-load non-critical components, minimize background work, efficient content-script injection, cache API responses.
* **Error handling:** try/catch for async, graceful degradation on API failure, user-friendly messages, log for debugging.
* **Communication (cross-context):** `chrome.runtime.sendMessage` for one-shot; port-based for long-lived; event-driven; avoid polling.

## ⚙️ Workflow & Guardrails

1. **Verification Gate:** NEVER state a task is complete unless `npx tsc --noEmit` and `npm test` pass cleanly.
2. **Tests:** New features need Vitest + React Testing Library unit tests (≥80% coverage). E2E via Playwright (Chromium/Firefox). Run tests before committing.
3. **Git Workflow:**
   * Branch feature branches off `main`.
   * Use **Conventional Commits**: `feat:` when a feature is finished, `chore:` for intermediate architectural building blocks, `fix:` for bug fixes.
   * Avoid pushing after every minor save — wait until a clear milestone.
   * If Feature B depends on a data layer being rewritten in Feature A, don't push until both sides of the bridge are structurally sound.
4. **Security:** Sanitize all user inputs, validate message origins, no `eval()`/`innerHTML` with user data, CSP-compliant.
5. **Docs:** Keep `CLAUDE.md` (commands), `DEVELOPER.md` (architecture), and `README.md` (user changes) in sync with any modifications.

## 📚 Docs

* `README.md` — User-facing guide.
* `DEVELOPER.md` — Technical contributor guidelines.
* `architecture.md` — Data flow, storage, message flow, provider fallback overview.
* `.clinerules` — Claude-specific shim; points to this file for all rules.