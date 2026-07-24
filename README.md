# Zhihu User Blocker

A Chrome extension that lets you block users on Zhihu by hiding all their posts. When you block someone, their content disappears from your feed and you get a simple button to manage your blocked users.

## Documentation

| File | Goal | Audience |
| :--- | :--- | :--- |
| **README.md** | High-level project summary, features, prerequisites, & user setup | Users & New Developers |
| **DEVELOPER.md** | Deep architectural breakdown, state management, & domain logic | Contributors & Maintainers |
| **CLAUDE.md** | Machine-readable CLI triggers, test workflows, & strict guardrails | AI Coding Agents |

## What It Does

- **Block users**: Hide posts from specific Zhihu users with one click
- **Manage blocks**: View and unblock users anytime in the extension options
- **AI fact-checking**: Get AI-powered analysis of Zhihu content (optional feature)
- **Works everywhere**: Automatically detects and blocks users across Zhihu

## Features

### Seamless Blocking

- **One-click blocking**: Hide posts from specific Zhihu users directly from your feed.
- **Instant content hiding**: Blocked content disappears immediately.
- **Easy management**: View and unblock users anytime via the extension options page.

### AI-Powered Fact-Checking (Optional)

- **Contextual analysis**: Get AI-driven analysis of Zhihu content (posts, questions, answers).
- **Multi-language support**: Choose reply language (English, Traditional/Simplified Chinese).
- **Flexible AI providers with fallback**: Configure multiple AI providers (Claude, OpenAI, Gemini, DeepSeek, OpenRouter, local/Ollama, or any OpenAI-compatible endpoint). The extension automatically falls back to the next provider if the primary one fails.

## Quick Start

### Option 1: Install from GitHub Release

1. Download the latest `.zip` from [GitHub Releases](https://github.com/ericwong0318/chrome-extensions/releases)
2. Unzip the package
3. In Chrome, navigate to `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the unzipped folder

### Option 2: Build from Source

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/ericwong0318/chrome-extensions.git
   cd chrome-extensions
   npm install
   npm run build
   ```
2. In Chrome, navigate to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` folder

### Usage

- Visit Zhihu and use the **Block** button next to user names to hide their content.
- Open the extension options page to configure AI providers, then use the **Fact Check** button on content to get AI analysis.

## Tech Stack

| Layer    | Technology                 |
| -------- | -------------------------- |
| Build    | Vite + CRX plugin          |
| UI       | React + MUI + Emotion      |
| Testing  | Vitest + Playwright        |
| Language | TypeScript                 |

## Developer Notes

See [DEVELOPER.md](./DEVELOPER.md) for:
- Architecture diagram and how the extension works
- Deep-dive project structure
- Storage, security, privacy, and CI details
- Development tips and common gotchas

## Getting Help

For issues or questions:

1. Check the existing tests for examples
2. See [DEVELOPER.md](./DEVELOPER.md) for implementation details
3. Look at the options page for configuration options

## License

MIT

---

*Built with ❤️ for Zhihu users who want cleaner feeds!*