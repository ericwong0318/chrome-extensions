# Developer Guidelines

## Project Structure
- `src/`: Core extension components
  - `background.ts`: Service worker for message handling
  - `content.tsx`: Content script for DOM injection
  - `blocker/`: Blocking functionality
  - `factcheck/`: AI fact-checking
  - `options/`: User settings
  - `logger.ts`: Logging utility
  - `test/`: Test utilities
- `e2e/`: End-to-end tests with Playwright
- `manifest.json`: Extension manifest (MV3)
- `vite.config.ts`: Vite + CRX build config
- `vitest.config.ts`: Vitest testing config
- `playwright.config.js`: Playwright E2E config

## Coding Standards
- TypeScript: Strict mode
- React: Functional components with hooks
- UI: MUI 5 + Emotion
- Linting: ESLint + Prettier

## Testing
- Unit/Integration: `vitest` with jsdom
- E2E: `playwright` with Chromium
- Setup: `src/test/setup.ts` with chrome storage mocks

## Build & Deployment
- Development: `npm run dev`
- Production: `npm run build` → `dist/`
- Preview: `npm run preview`

## Constraints
1. Pass CI checks (GitHub Actions)
2. Content scripts: No direct DOM manipulation (use React portals)
3. Background scripts: Service worker with message passing only
4. Storage: `chrome.storage.sync` for user data, `chrome.storage.local` for logs
5. Security: Sanitize inputs, validate message origins, CSP compliance

## Extension Specifics
- Blocked users: `zhihuBlockedUsers` (array of {id, name})
- Fact-check config: `factCheckConfig`
- Logs: `chrome.storage.local`
- Message actions: blockUser, unblockUser, getBlockedUsers, factCheck
- Toolbar action: opens options page via `chrome.runtime.openOptionsPage`