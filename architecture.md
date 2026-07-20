# Architecture Overview

## Data Flow
```mermaid
graph TD
    A["Content Script<br/>(src/content.tsx)"] -->|sendMessage| B["Background Script<br/>(src/background.ts)"]
    B -->|process| C["Storage<br/>(chrome.storage.local/sync)"]
    C -->|read/write| D["Options Page<br/>(src/options/)"]
    B -->|sendResponse| A
    B -->|handle actions| E["Feature Modules"]
    E -->|blocker| F["Blocker<br/>(src/blocker/Blocker.tsx)"]
    E -->|factcheck| G["FactCheck<br/>(src/factcheck/FactCheck.tsx)"]
```

## Storage
- **chrome.storage.local**: Logs and cached data
- **chrome.storage.sync**: User preferences and blocked users list (`zhihuBlockedUsers`)

## Message Flow
1. **User Action** → Content Script receives event  
2. **Message** → Content Script sends message to Background Script  
3. **Processing** → Background Script processes request  
4. **Storage** → Background Script reads/writes to chrome.storage  
5. **Response** → Background Script sends response back  
6. **Update** → Content Script updates UI  

## AI Provider Fallback
- The Options page stores an ordered list of providers in `factCheckConfigs` (first = primary, rest = fallbacks).
- On a `factCheck` message, the background script calls `callProviders` (in `src/factcheck/providers.ts`), which tries each provider in order and falls back to the next on any failure (missing key, HTTP error, network error).
- The successful provider id is returned so the UI can display `via <provider>`. If all providers fail, an aggregated error lists every attempt.

## Testing
- **Unit/Integration**: Vitest (`src/**/*.test.ts`)  
- **End-to-End**: Playwright (`e2e/extension.spec.ts`)  

## Key Files
- `manifest.json`: Extension configuration  
- `vite.config.ts`: Build configuration  
- `src/background.ts`: Service worker logic  
- `src/content.tsx`: Content script entry point  
- `src/blocker/Blocker.tsx`: Blocking UI component  
- `src/options/Options.tsx`: Options page UI  
- `src/factcheck/FactCheck.tsx`: Fact-checking UI component