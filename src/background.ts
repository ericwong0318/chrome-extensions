import { logError } from './logger';
import { callProviders, FactCheckConfig } from './factcheck/providers';

export {};

// Open the options page (block list) when the extension icon is clicked.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'blockUser') {
      // Store blocked users as {id, name} objects for a richer block list
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        const list = result.zhihuBlockedUsers as { id: string; name: string }[];
        const entry = { id: request.userId, name: request.userName || request.userId };
        // Avoid duplicates by id
        const updated = list.some((u) => u.id === entry.id)
          ? list
          : [...list, entry];
        chrome.storage.sync.set({ zhihuBlockedUsers: updated }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    if (request.action === 'unblockUser') {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        const list = result.zhihuBlockedUsers as { id: string; name: string }[];
        const updated = list.filter((u) => u.id !== request.userId);
        chrome.storage.sync.set({ zhihuBlockedUsers: updated }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    if (request.action === 'getBlockedUsers') {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        sendResponse({ users: result.zhihuBlockedUsers as { id: string; name: string }[] });
      });
      return true;
    }

    if (request.action === 'factCheck') {
      // Legacy one-shot path: if a port is not attached, fall back to a single
      // sendResponse. (The content script now uses a long-lived port instead.)
      chrome.storage.sync.get(
        { factCheckConfigs: null, factCheckConfig: null, factCheckTimeoutSec: 9 },
        (result) => {
        const list = result.factCheckConfigs as FactCheckConfig[] | null | undefined;
        const legacy = result.factCheckConfig as
          | { provider?: string; apiKey?: string; model?: string; baseUrl?: string; language?: string }
          | null
          | undefined;

        const configs: FactCheckConfig[] = Array.isArray(list) && list.length > 0
          ? list
          : legacy && legacy.provider
            ? [{
                provider: legacy.provider as FactCheckConfig['provider'],
                apiKey: legacy.apiKey,
                model: legacy.model,
                baseUrl: legacy.baseUrl,
                language: legacy.language as FactCheckConfig['language'],
              }]
            : [];

        if (configs.length === 0) {
          sendResponse({ disabled: true });
          return;
        }

        const timeoutSec = Math.min(Math.max(Number(result.factCheckTimeoutSec) || 9, 1), 120);
        const timeoutMs = timeoutSec * 1000;

        callProviders(request.text ?? '', configs, undefined, timeoutMs).then((res) => {
          if (res.ok) sendResponse({ result: res.result, provider: res.provider });
          else sendResponse({ error: res.error });
        });
      });
      return true;
    }

    return;
  } catch (err) {
    logError('Error handling message', String(err));
    return;
  }
});

// Long-lived port for fact-check streaming. The content script connects with
// name 'factCheck' and sends { text } as the first message; the background
// streams stage updates (and the final result/error) back over the same port.
// A port is required because a single sendResponse can only be called once.
if (chrome.runtime.onConnect) {
  chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'factCheck') return;

  port.onMessage.addListener((msg: any) => {
    if (!msg || typeof msg.text !== 'string') return;
    chrome.storage.sync.get(
      { factCheckConfigs: null, factCheckConfig: null, factCheckTimeoutSec: 9 },
      (result) => {
        const list = result.factCheckConfigs as FactCheckConfig[] | null | undefined;
        const legacy = result.factCheckConfig as
          | { provider?: string; apiKey?: string; model?: string; baseUrl?: string; language?: string }
          | null
          | undefined;

        const configs: FactCheckConfig[] = Array.isArray(list) && list.length > 0
          ? list
          : legacy && legacy.provider
            ? [{
                provider: legacy.provider as FactCheckConfig['provider'],
                apiKey: legacy.apiKey,
                model: legacy.model,
                baseUrl: legacy.baseUrl,
                language: legacy.language as FactCheckConfig['language'],
              }]
            : [];

        if (configs.length === 0) {
          port.postMessage({ disabled: true });
          return;
        }

        const timeoutSec = Math.min(Math.max(Number(result.factCheckTimeoutSec) || 9, 1), 120);
        const timeoutMs = timeoutSec * 1000;

        const onStage = (stage: string, isRetry: boolean) => {
          try { port.postMessage({ stage, isRetry }); } catch { /* port closed */ }
        };
        callProviders(msg.text, configs, onStage, timeoutMs).then((res) => {
          if (res.ok) port.postMessage({ result: res.result, provider: res.provider });
          else port.postMessage({ error: res.error });
        });
      }
    );
  });

  port.onDisconnect.addListener(() => {
    // Port closed by the content script; nothing to clean up.
  });
  });
}
