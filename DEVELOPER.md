# Developer Guidelines

## Project Structure

### Core Components
- `src/`: Main extension source code
  - `background.ts`: MV3 Service Worker for message handling, background tasks, and service worker logic
  - `content.tsx`: Content script for DOM injection and UI overlay
  - `blocker/`: User blocking functionality
    - `Blocker.tsx`: UI component for blocking users
    - `useBlockUser.ts`: Custom hook for blocking logic
  - `factcheck/`: AI fact-checking module
    - `pipeline.ts`: Fact-checking pipeline orchestrator
    - `providers.ts`: Provider communication and fallback logic
    - `agents/`: Individual fact-checking agents (Critic, Parser, Logic, Bias)
    - `factcheck.test.ts`: Tests for fact-checking functionality
  - `options/`: Extension settings and options page
    - `Options.tsx`: Main options interface
    - `useZhihuContent.ts`: Hook for accessing Zhihu content
  - `logger.ts`: Logging utility for debugging and auditing
  - `components/`: Reusable UI components
    - `BlockUserButton.tsx`: Button for blocking users
    - `FactCheckButton.tsx`: Button for triggering fact-checking
    - `LogViewer.tsx`: Viewer for extension logs
  - `hooks/`: Custom React hooks
    - `useFactCheckConfig.ts`: Hook for managing fact-check configurations
    - `useFactCheckRunner.ts`: Hook for executing fact-check workflows
    - `useLogs.ts`: Hook for accessing logs
    - `useZhihuContent.ts`: Hook for interacting with Zhihu content
  - `types/`: TypeScript type definitions
    - `request.ts`: Type definitions for request/response types
    - `index.ts`: Main type exports
  - `test/`: Test utilities and setup
    - `setup.ts`: Test setup with chrome storage mocks

### Testing
- `e2e/`: End-to-end tests with Playwright
  - `extension.spec.ts`: E2E test specifications
  - `server.mjs`: E2E server configuration
  - `fixtures/`: Test fixtures and helpers
- Unit and integration tests using Vitest
- Test setup with proper mocking of chrome APIs

### Configuration Files
- `manifest.json`: Extension manifest (MV3) with permissions and content scripts
- `vite.config.ts`: Vite configuration with CRX plugin for Chrome extensions
- `vitest.config.ts`: Vitest configuration for test runs
- `playwright.config.js`: Playwright E2E test configuration
- `tsconfig.json`: TypeScript compiler configuration with strict mode
- `eslint.config.mjs`: ESLint configuration with Prettier integration
- `prettierrc.json`: Prettier configuration for code formatting
- `vitest.config.ts`: Vitest test runner configuration

### Build & Deployment
- Production Build: `npm run build` → outputs to `dist/`
- Development Mode: `npm run dev` for hot reloading
- Preview Built Extension: `npm run preview`
- Type Safety Check: `npx tsc --noEmit` for type checking without emitting files
- Unit Tests: `npm test` (alias for `vitest run`)
- E2E Tests: `npx playwright test` (requires prior build)
- Watch Mode: `npm run test:watch` for continuous testing

## Coding Standards
- TypeScript: Strict mode enforced, no implicit any types
- React: Functional components with hooks only
- UI Library: MUI 5 + Emotion for styling
- Import Order: External dependencies → internal utilities → component styles
- Naming Conventions:
  - Files/Directories: kebab-case
  - Components: PascalCase
  - Variables/Functions: camelCase
- Documentation: JSDoc for all public APIs
- Performance: Lazy-load non-critical components, minimize background work
- Error Handling: try/catch for async operations, graceful degradation
- Security: Input sanitization, message origin validation, CSP compliance

## AI Task Completion Protocol
After completing any development task, the AI must run the full test suite and build to verify changes:
1. Run tests: `npm test -- path/to/test-file` or `npm test` for all tests
2. Build project: `npm run build`

Both commands must pass before considering the task complete.

## Constraints
1. Pass CI checks (GitHub Actions)
2. Content scripts: No direct DOM manipulation (use React portals)
3. Background scripts: Service worker with message passing only
4. Storage: `chrome.storage.sync` for user data, `chrome.storage.local` for logs
5. Security: Sanitize inputs, validate message origins, CSP compliance
6. **File Length Limit:** No single `.ts`/`.tsx` file may exceed **250 lines**. When a file reaches capacity, extract logical modules into sub-files (e.g. `src/factcheck/agents/`). This keeps modules readable and reviewable.

## Extension Specifics
- Blocked users: Stored in `chrome.storage.sync` under key `zhihuBlockedUsers` (array of {id, name})
- Fact-check config: Stored in `chrome.storage.sync` under key `factCheckConfigs` (ordered array of provider configs; first = primary, rest = fallbacks). Legacy single `factCheckConfig` still read for backward compatibility.
- Logs: Stored in `chrome.storage.local` under key `extensionLogs`
- Message actions: `blockUser`, `unblockUser`, `getBlockedUsers`, `factCheck`
- Toolbar action: Opens options page via `chrome.runtime.openOptionsPage`

## Fact-Check Provider Fallback
- `src/factcheck/providers.ts` exports `callProvider` (single provider call) and `callProviders` (ordered list with fallback).
- `callProviders` tries each config in order; on any failure (missing key, HTTP error, network error) it moves to the next provider. If all fail, it returns aggregated error listing all attempts.
- The background service worker (`src/background.ts`) reads `factCheckConfigs` and calls `callProviders`, returning the successful provider id to UI.
- Options page allows users to add/remove/reorder providers to define fallback order.

## Testing Strategy
- Unit Tests: Cover core logic, hooks, and utilities with Vitest + jsdom
- Integration Tests: Test component interactions and state management
- E2E Tests: Validate user flows with Playwright across Chrome instances
- Test Coverage: Minimum 80% coverage required for all new code
- Test Isolation: Mock chrome APIs and storage appropriately
- Test Naming: Follow pattern `[feature].test.[extension]` for clarity

## Linting & Formatting
- Pre-commit Hook: ESLint + Prettier validation
- Scripts: 
  - `npm run lint`: Run ESLint across all source files
  - `npm run format`: Apply Prettier formatting
  - `npm run lint:fix`: Auto-fix linting issues
- Integration: Linting runs automatically before commit and test execution