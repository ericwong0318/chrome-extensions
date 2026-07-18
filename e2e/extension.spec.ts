import { test, expect } from '@playwright/test';

// End-to-end check that the REAL extension content script boots on a page and
// injects its UI. We serve a local Zhihu-like fixture (e2e/fixtures) over
// http://127.0.0.1 so the test runs offline while still exercising the actual
// extension (matched via the http://127.0.0.1/* content_scripts match).
test('extension mounts #my-extension-root and injects a Block button next to a user name', async ({ page }) => {
  await page.goto('/');

  // The content script creates its isolated Shadow-DOM root unconditionally.
  const root = page.locator('#my-extension-root');
  await expect(root).toHaveCount(1);
  await expect(root).toHaveJSProperty('shadowRoot', expect.any(Object));

  // The inline control is portaled right after each detected user link.
  const blockBtn = page.locator('.UserLink-link + .zhihu-block-inline button');
  await expect(blockBtn.first()).toHaveText('Block');
  await expect(blockBtn).toHaveCount(2);
});