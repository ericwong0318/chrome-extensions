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
      // Support both the new ordered list (factCheckConfigs) and the legacy
      // single config (factCheckConfig) for backward compatibility.
      chrome.storage.sync.get({ factCheckConfigs: null, factCheckConfig: null }, (result) => {
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

        callProviders(request.text ?? '', configs).then((res) => {
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