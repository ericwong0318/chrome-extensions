# Zhihu User Blocker (Manifest V3)  
## Project Structure  

### Core Extension Components  
- `src/`: Main extension source code  
- `background.ts`: MV3 Service Worker for message handling, background tasks  
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

### Build & Deployment  
- Production Build: `npm run build` → outputs to `dist/`  
- Development Mode: `npm run dev` for hot reloading  
- Preview Built Extension: `npm run preview`  
- Type Safety Check: `npx tsc --noEmit` for type checking without emitting files  
- Unit Tests: `npm test` (alias for `vitest run`)  
- E2E Tests: `npx playwright test` (requires prior build)  

## Project Structure Details  
### src/  
- **background.ts**: MV3 Service Worker implementation handling message passing, service worker lifecycle, and background tasks  
- **content.tsx**: Content script that injects UI elements into Zhihu pages and manages DOM interactions  
- **blocker/**: User blocking functionality  
  - `Blocker.tsx`: React component for displaying blocking UI  
  - `useBlockUser.ts`: Custom hook for managing blocked users  
- **factcheck/**: AI fact-checking module  
  - `pipeline.ts`: Main orchestrator for fact-checking workflows  
  - `providers.ts`: Provider communication layer with fallback logic  
  - `agents/`: Individual fact-checking agents  
    - `Bias.ts`: Detects AI bias in content  
    - `Critic.ts`: Actors as critics for content evaluation  
    - `Logic.ts`: Analyzes content logic  
    - `Parser.ts`: Parses content into structured data  
  - `factcheck.test.ts`: Unit tests for fact-checking pipeline  
- **options/**: Extension settings and configuration  
  - `Options.tsx`: Main options page interface  
  - `useZhihuContent.ts`: Hook for accessing Zhihu content  
- **logger.ts**: Centralized logging utility for debugging and auditing  
- **components/**: Reusable UI components  
  - `BlockUserButton.tsx`: Button for blocking users  
  - `FactCheckButton.tsx`: Button for triggering fact-checking  
  - `LogViewer.tsx`: Component for viewing extension logs  
- **hooks/**: Custom React hooks  
  - `useFactCheckConfig.ts`: Hook for managing fact-check configurations  
  - `useFactCheckRunner.ts`: Hook for executing fact-check workflows  
  - `useLogs.ts`: Hook for accessing extension logs  
  - `useZhihuContent.ts`: Hook for interacting with Zhihu content  
- **types/**: TypeScript type definitions  
  - `request.ts`: Type definitions for request/response types  
  - `index.ts`: Main type exports  
- **test/**: Test utilities and setup  
  - `setup.ts`: Test setup with chrome storage mocks  

### e2e/  
- `extension.spec.ts`: End-to-end test specifications  
- `server.mjs`: E2E server configuration for testing  
- `fixtures/`: Test fixtures and helper utilities  

### Key Configuration Files  
- `manifest.json`: Extension manifest with MV3 permissions, content scripts, and background service worker registration  
- `vite.config.ts`: Vite configuration with CRX plugin for Chrome extension packaging  
- `vitest.config.ts`: Vitest configuration for test runner  
- `playwright.config.js`: Playwright E2E test configuration  
- `tsconfig.json`: TypeScript compiler configuration with strict mode  
- `eslint.config.mjs`: ESLint configuration with Prettier integration  
- `prettierrc.json`: Prettier configuration for code formatting  

### Build & Deployment Process  
#### Development Workflow  
- `npm run dev`: Start development server with hot reloading  
- `npm run build`: Create production build in `dist/` directory  
- `npm run preview`: Preview built extension in development environment  
- `npm test`: Run unit and integration tests with Vitest  
- `npm run test:watch`: Watch mode for continuous testing during development  

#### Production Workflow  
- `npm run build`: Create production build (outputs to `dist/`)  
- `npx tsc --noEmit`: Type safety check without emitting files  
- `npm test`: Run full test suite before production  
- `npx playwright test`: Execute E2E tests after build completion  

## Fact-Check Provider Fallback System  
#### Provider Configuration  
- Stored in `chrome.storage.sync` under key `factCheckConfigs`  
- Format: Ordered array of provider configurations  
  - Each provider config includes:  
    - `provider`: Provider identifier (e.g., "claude", "openai", "gemini")  
    - `apiKey`: API key for authentication  
    - `model`: Model identifier for the provider  
    - `baseUrl`: Base URL for API endpoint  
    - `language`: Language code for localization  

#### Fallback Logic  
- `callProviders` function in `src/factcheck/providers.ts` handles provider fallback  
- Tries each provider config in order until one succeeds  
- On failure (missing key, HTTP error, network error), moves to next provider  
- Returns successful provider ID to UI for display  
- If all providers fail, returns aggregated error listing all attempts  

#### Legacy Support  
- Also reads legacy `factCheckConfig` for backward compatibility  
- Maintains compatibility with older versions of the extension  

## Extension Specifics  
#### Storage  
- Blocked users: `chrome.storage.sync` under key `zhihuBlockedUsers` (array of `{id, name}`)  
- Fact-check config: `chrome.storage.sync` under key `factCheckConfigs`  
- Logs: `chrome.storage.local` under key `extensionLogs`  

#### Message Actions  
- `blockUser`: Block a user and add to blocked list  
- `unblockUser`: Remove user from blocked list  
- `getBlockedUsers`: Retrieve current blocked users  
- `factCheck`: Execute fact-checking workflow  

#### Toolbar Action  
- Opens options page via `chrome.runtime.openOptionsPage`  

## Testing Strategy  
#### Unit Tests (Vitest)  
- Cover core logic, hooks, and utilities  
- Minimum 80% coverage required for new code  
- Mock chrome APIs and storage appropriately  

#### Integration Tests  
- Test component interactions and state management  
- Validate custom hook functionality  

#### E2E Tests (Playwright)  
- Validate user flows with Playwright across Chrome instances  
- Test blocking functionality and fact-checking workflows  

#### Test Coverage Requirements  
- Minimum 80% coverage for all new code  
- All existing tests must pass  
- CI runs tests before allowing commits  

## Linting & Formatting  
#### Pre-commit Hook  
- ESLint + Prettier validation automatically runs before commit  

#### Scripts  
- `npm run lint`: Run ESLint across all source files  
- `npm run format`: Apply Prettier formatting  
- `npm run lint:fix`: Auto-fix linting issues  

#### Integration  
- Linting runs automatically before commit and test execution  
- Ensures consistent code style and catches issues early