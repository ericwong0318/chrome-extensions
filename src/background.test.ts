import { mockChromeStorage } from './test/setup';

// Re-create the listener logic in isolation by importing the module side-effect.
// We simulate chrome.runtime.onMessage by capturing the registered listener.
const listeners: Array<(req: any, sender: any, sendResponse: any) => any> = [];

const mockRuntime = {
  onMessage: {
    addListener: (fn: any) => listeners.push(fn),
  },
  sendMessage: {
    addListener: (fn: any) => fn,
  },
  openOptionsPage: vi.fn(),
};

const mockAction = {
  onClicked: {
    addListener: vi.fn(),
  },
};

beforeEach(() => {
  listeners.length = 0;
  (global as any).chrome = { runtime: mockRuntime, storage: mockChromeStorage, action: mockAction };
  // Clear module registry so background.ts re-registers its listener fresh.
  vi.resetModules();
});

const sendResponse = vi.fn();

async function dispatch(request: any) {
  // Import after chrome is set so the listener registers against our mock.
  await import('./background');
  const listener = listeners[listeners.length - 1];
  const result = listener(request, {}, sendResponse);
  // Allow async storage callbacks to flush.
  await new Promise((r) => setTimeout(r, 0));
  return result;
}

describe('background message handler', () => {
  it('blockUser adds a new user without duplicates', async () => {
    const r1 = await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    expect(r1).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    // Block same user again -> no duplicate
    sendResponse.mockClear();
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(1);
  });

  it('unblockUser removes the user', async () => {
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    sendResponse.mockClear();
    const r = await dispatch({ action: 'unblockUser', userId: 'u1' });
    expect(r).toBe(true);
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(0);
  });

  it('getBlockedUsers returns the current list', async () => {
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    sendResponse.mockClear();
    await dispatch({ action: 'getBlockedUsers' });
    expect(sendResponse).toHaveBeenCalledWith({ users: [{ id: 'u1', name: 'Alice' }] });
  });

  it('returns undefined for unknown actions', async () => {
    const r = await dispatch({ action: 'unknown' });
    expect(r).toBeUndefined();
  });

  it('registers an action.onClicked listener that opens the options page', async () => {
    mockAction.onClicked.addListener.mockClear();
    await import('./background');
    expect(mockAction.onClicked.addListener).toHaveBeenCalledTimes(1);
    const handler = mockAction.onClicked.addListener.mock.calls[0][0];
    handler();
    expect(mockRuntime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it('round-trips a blockUser message from a content script and persists it', async () => {
    // Register the background listener (populates `listeners`).
    await dispatch({ action: 'getBlockedUsers' });
    const listener = listeners[listeners.length - 1];
    // Simulate a content script sending a blockUser message via chrome.runtime.onMessage.
    listener({ action: 'blockUser', userId: 'u9', userName: 'Zoe' }, {}, vi.fn());
    await new Promise((r) => setTimeout(r, 0));

    // The user should now be persisted in storage (the integration contract).
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toEqual([{ id: 'u9', name: 'Zoe' }]);
  });
});
