import { afterEach, describe, expect, it, vi } from 'vitest';

describe('content script (integration)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('mounts the extension root with a Shadow DOM into the page body', async () => {
    // content.tsx runs on import; it should create #my-extension-root.
    await import('./content');
    const host = document.getElementById('my-extension-root');
    expect(host).not.toBeNull();
    expect(host?.parentElement).toBe(document.body);
    // Shadow Root isolates the extension's own UI/styles.
    expect(host?.shadowRoot).not.toBeNull();
  });

  it('does not mount a second root on repeated execution', async () => {
    await import('./content');
    expect(document.querySelectorAll('#my-extension-root')).toHaveLength(1);
    // Re-import (module cached) must not create a duplicate root.
    await import('./content');
    expect(document.querySelectorAll('#my-extension-root')).toHaveLength(1);
  });
});