const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

// Load the unpacked extension from the build output.
const distPath = path.resolve(__dirname, 'dist');
const PORT = 8777;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  // Serve a local Zhihu-like fixture so the E2E runs offline while still
  // exercising the REAL extension content script (matched via http://127.0.0.1/*).
  webServer: {
    command: `node e2e/server.mjs`,
    port: PORT,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: {
      // Load only our extension so it doesn't conflict with others.
      args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});