import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Mock chrome.storage for tests (both sync and local share the same store)
const store: Record<string, any> = {};

const makeArea = () => ({
  get: (keys: any, cb?: (result: any) => void) => {
    const result: any = {};
    if (typeof keys === 'object' && keys !== null && !Array.isArray(keys)) {
      for (const k of Object.keys(keys)) result[k] = k in store ? store[k] : keys[k];
    } else if (typeof keys === 'string') {
      result[keys] = store[keys];
    }
    if (cb) cb(result);
    return Promise.resolve(result);
  },
  set: (items: any, cb?: () => void) => {
    Object.assign(store, items);
    if (cb) cb();
    return Promise.resolve();
  },
});

export const mockChromeStorage = {
  sync: makeArea(),
  local: makeArea(),
};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  (global as any).chrome = { storage: mockChromeStorage };
});
