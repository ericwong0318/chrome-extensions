import { mockChromeStorage } from './test/setup';

// Re-create the listener logic in isolation by importing the module side-effect.
// We simulate chrome.runtime.onMessage by capturing the registered listener.
const listeners: Array<(req: any, sender: any, sendResponse: any) => any> = [];
const connectListeners: Array<(port: any) => void> = [];

const mockRuntime = {
  onMessage: {
    addListener: (fn: any) => listeners.push(fn),
  },
  onConnect: {
    addListener: (fn: any) => connectListeners.push(fn),
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
  connectListeners.length = 0;
  (global as any).chrome = {
    runtime: mockRuntime,
    storage: mockChromeStorage,
    action: mockAction,
  };
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
    const r1 = await dispatch({
      action: 'blockUser',
      userId: 'u1',
      userName: 'Alice',
    });
    expect(r1).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    // Block same user again -> no duplicate
    sendResponse.mockClear();
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    const stored = (await mockChromeStorage.sync.get({
      zhihuBlockedUsers: [],
    })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(1);
  });

  it('unblockUser removes the user', async () => {
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    sendResponse.mockClear();
    const r = await dispatch({ action: 'unblockUser', userId: 'u1' });
    expect(r).toBe(true);
    const stored = (await mockChromeStorage.sync.get({
      zhihuBlockedUsers: [],
    })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(0);
  });

  it('getBlockedUsers returns the current list', async () => {
    await dispatch({ action: 'blockUser', userId: 'u1', userName: 'Alice' });
    sendResponse.mockClear();
    await dispatch({ action: 'getBlockedUsers' });
    expect(sendResponse).toHaveBeenCalledWith({
      users: [{ id: 'u1', name: 'Alice' }],
    });
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

  it('cancels the in-flight fact-check when the content port disconnects', async () => {
    const captured: { signal?: AbortSignal } = {};
    const callProvidersMock = vi.fn(
      (
        text: string,
        configs: any,
        onStage: any,
        timeoutMs: number,
        signal?: AbortSignal,
      ) => {
        captured.signal = signal;
        return new Promise(() => {
          // Keep the promise pending to simulate an in-flight request.
        });
      },
    );
    await mockChromeStorage.sync.set({
      factCheckConfigs: [{ provider: 'openai', apiKey: 'oai' }],
    });
    vi.doMock('./factcheck/providers', () => ({
      callProviders: callProvidersMock,
    }));

    await import('./background');
    expect(connectListeners).toHaveLength(1);

    const port = {
      name: 'factCheck',
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
      postMessage: vi.fn(),
    } as any;
    connectListeners[0](port);

    expect(port.onMessage.addListener).toHaveBeenCalledTimes(1);
    const messageListener = port.onMessage.addListener.mock.calls[0][0];
    messageListener({ text: 'hello' });
    await new Promise((r) => setTimeout(r, 0));

    expect(callProvidersMock).toHaveBeenCalledTimes(1);
    expect(captured.signal).toBeDefined();

    expect(port.onDisconnect.addListener).toHaveBeenCalledTimes(2);
    const disconnectHandler = port.onDisconnect.addListener.mock.calls[1][0];
    disconnectHandler();
    expect(captured.signal?.aborted).toBe(true);
  });

  it('streams stage updates and the final result over the fact-check port', async () => {
    const callProvidersMock = vi.fn(
      (text: string, configs: any, onStage: any) => {
        onStage('Contacting AI provider…', false);
        onStage('Contacting AI provider…', true);
        return Promise.resolve({
          ok: true,
          result: {
            validityVsTruth: 'Stage streaming works.',
            rhetoric: { ethos: 'Low', pathos: 'Low', logos: 'High' },
            fallacies: [],
            verdict: 'credible',
          },
          provider: 'openai',
        });
      },
    );

    await mockChromeStorage.sync.set({
      factCheckConfigs: [{ provider: 'openai', apiKey: 'oai' }],
    });
    vi.doMock('./factcheck/providers', () => ({
      callProviders: callProvidersMock,
    }));

    await import('./background');
    expect(connectListeners).toHaveLength(1);

    const port = {
      name: 'factCheck',
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
      postMessage: vi.fn(),
    } as any;
    connectListeners[0](port);

    const messageListener = port.onMessage.addListener.mock.calls[0][0];
    messageListener({ text: 'hello' });
    await new Promise((r) => setTimeout(r, 0));

    expect(callProvidersMock).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenCalledWith({
      stage: 'Contacting AI provider…',
      isRetry: false,
    });
    expect(port.postMessage).toHaveBeenCalledWith({
      stage: 'Contacting AI provider…',
      isRetry: true,
    });
    expect(port.postMessage).toHaveBeenCalledWith({
      result: expect.objectContaining({ verdict: 'credible' }),
      provider: 'openai',
    });
  });

  it('round-trips a blockUser message from a content script and persists it', async () => {
    // Register the background listener (populates `listeners`).
    await dispatch({ action: 'getBlockedUsers' });
    const listener = listeners[listeners.length - 1];
    // Simulate a content script sending a blockUser message via chrome.runtime.onMessage.
    listener(
      { action: 'blockUser', userId: 'u9', userName: 'Zoe' },
      {},
      vi.fn(),
    );
    await new Promise((r) => setTimeout(r, 0));

    // The user should now be persisted in storage (the integration contract).
    const stored = (await mockChromeStorage.sync.get({
      zhihuBlockedUsers: [],
    })) as any;
    expect(stored.zhihuBlockedUsers).toEqual([{ id: 'u9', name: 'Zoe' }]);
  });
});
