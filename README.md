# Zhihu User Blocker

A Chrome extension that lets you block users on Zhihu by hiding all their posts. When you block someone, their content disappears from your feed and you get a simple button to manage your blocked users.

## What It Does

- **Block users**: Hide posts from specific Zhihu users with one click
- **Manage blocks**: View and unblock users anytime in the extension options
- **AI fact-checking**: Get AI-powered analysis of Zhihu content (optional feature)
- **Works everywhere**: Automatically detects and blocks users across Zhihu

## Quick Start

### Install (Load Unpacked)

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

3. **Start blocking:**
   - Visit Zhihu
   - Look for the **Block** button next to user names
   - Click to hide their posts

### Managing Blocks

- **Toolbar icon**: Click to open options page
- **Block button**: Hides user's posts and adds to blocked list
- **Unblock button**: Removes user from blocked list (content reappears)
- **Clear all**: Removes all blocked users at once

## Features

### Simple Blocking
- One-click blocking of Zhihu users
- Content immediately hidden from your feed
- Toggle between blocked and unblocked states

### Options Page
- View all blocked users
- Unblock individual users
- Clear entire block list
- Configure AI fact-checking (optional)

### AI Fact-Checking (Optional)
- Click **Fact Check** button on Zhihu content
- Get AI analysis of posts/questions
- See structured breakdown of arguments and credibility
- Choose reply language (English, Traditional/Simplified Chinese)
- **Multiple providers with fallback**: Configure several AI providers (Claude, OpenAI, Gemini, DeepSeek, OpenRouter, local/Ollama, or any OpenAI-compatible endpoint) in your preferred order. If the first provider fails (rate limit, bad key, server error, network issue), the extension automatically falls back to the next one. The result shows which provider answered (`via <provider>`).

## Tech Stack (Behind the Scenes)

| Layer | Technology |
|-------|------------|
| Build | Vite 5 + CRX plugin |
| UI | React 18 + MUI 5 + Emotion |
| Testing | Vitest + Playwright |
| Language | TypeScript |

## Development

### Commands
```bash
npm run dev        # Development mode
npm run build      # Build for production
npm run preview    # Preview built extension
npm test          # Run tests
npm run test:watch # Watch mode for tests
```

### Project Structure
```
src/
  background.ts    # Extension background logic
  content.tsx     # Content script (injects into web pages)
  blocker/         # Blocking functionality
  factcheck/       # AI fact-checking
  options/         # User settings page
  logger.ts        # Logging utility
e2e/              # End-to-end tests
```

## How It Works

1. **Detection**: Content script looks for Zhihu user links
2. **Injection**: Adds Block/Fact Check buttons next to user names
3. **Storage**: Blocked users saved to Chrome storage (syncs across devices)
4. **Hiding**: Blocked content hidden via CSS (`display: none`)
5. **Management**: Options page lets you view and manage blocked users

## Testing

The extension has comprehensive tests:
- **53 test cases** across 6 files
- **52 unit/integration tests** with Vitest
- **1 end-to-end test** with Playwright
- All tests run in CI before merging

## Storage

Blocked users are stored in Chrome's sync storage under the key `zhihuBlockedUsers` as an array of user objects. This means your blocked list syncs across all Chrome devices where you're signed in.

Fact-check providers are stored under the key `factCheckConfigs` as an ordered array of provider configs (each with `provider`, `apiKey`, `model`, `baseUrl`, `language`). The first entry is the primary provider; subsequent entries are fallbacks tried in order when a provider fails. A legacy single `factCheckConfig` key is still read for backward compatibility.

## Security & Privacy

- **Local storage**: User data stored in your Chrome account
- **No external APIs**: Extension works offline for basic blocking
- **Secure messaging**: Background script handles all communication
- **Shadow DOM**: Extension styles isolated to prevent page contamination

## CI/CD

The project uses GitHub Actions for:
- **CI**: Runs tests and builds on every PR
- **Release**: Automated releases with version bumping
- **Conventional commits**: Automated version management

## Getting Help

For issues or questions:
1. Check the existing tests for examples
2. Review the code in `src/` for implementation details
3. Look at the options page for configuration options

---

*Built with ❤️ for Zhihu users who want cleaner feeds!*