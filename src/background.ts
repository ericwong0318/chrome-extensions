import { logError } from './logger';
import { callProvider } from './factcheck/providers';

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
      chrome.storage.sync.get({ factCheckConfig: null }, (result) => {
        const cfg = result.factCheckConfig as
          | { provider?: string; apiKey?: string; model?: string; baseUrl?: string; language?: string }
          | null
          | undefined;
        if (!cfg || !cfg.provider) {
          sendResponse({ disabled: true });
          return;
        }
        callProvider(request.text ?? '', {
          provider: cfg.provider as any,
          apiKey: cfg.apiKey,
          model: cfg.model,
          baseUrl: cfg.baseUrl,
          language: cfg.language as any,
        }).then((res) => {
          if (res.ok) sendResponse({ result: res.result });
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