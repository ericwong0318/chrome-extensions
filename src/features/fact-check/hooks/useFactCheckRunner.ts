import { useCallback } from 'react';

export const runFactCheck = (text: string, question: string | undefined, language: string, timeoutSec: number): Promise<unknown> => {
  return new Promise((resolve) => {
    if (!chrome.runtime?.connect) { resolve({ error: 'Extension unavailable.' }); return; }
    const port = chrome.runtime.connect({ name: 'factCheck' });
    let settled = false;
    const finish = (val: unknown) => { if (settled) return; settled = true; try { port.disconnect(); } catch { /* ignore */ } resolve(val); };
    port.onMessage.addListener((msg: unknown) => {
      if (!msg) { finish({ error: 'No response.' }); return; }
      if (typeof msg === 'object' && msg && 'stage' in msg) { return; }
      if (typeof msg === 'object' && msg && 'disabled' in msg) { finish({ error: 'No provider configured.' }); return; }
      if (typeof msg === 'object' && msg && 'error' in msg) { finish({ error: (msg as { error: string }).error }); return; }
      if (typeof msg === 'object' && msg && 'result' in msg) { finish(msg); return; }
      finish(msg);
    });
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) finish({ error: chrome.runtime.lastError.message });
      else if (!settled) finish({ error: 'Connection closed.' });
    });
    port.postMessage({ text, question, language, timeoutSec });
  });
};

export const useFactCheckRunner = (language: string, timeoutSec: number) => {
  return useCallback((text: string, question?: string) => runFactCheck(text, question, language, timeoutSec), [language, timeoutSec]);
};
