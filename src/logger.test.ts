import { describe, it, expect, beforeEach } from 'vitest';
import { logError, logWarn, logInfo, getLogs, clearLogs } from './logger';
import { mockChromeStorage } from './test/setup';

beforeEach(async () => {
  (global as any).chrome = { storage: mockChromeStorage };
  await clearLogs();
});

describe('logger', () => {
  it('stores an error log entry in chrome.storage.local', async () => {
    logError('boom', 'background');
    // logger writes asynchronously; wait a tick
    await new Promise((r) => setTimeout(r, 10));
    const logs = await getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('boom');
    expect(logs[0].context).toBe('background');
    expect(typeof logs[0].time).toBe('number');
  });

  it('records warn and info levels', async () => {
    await logWarn('careful');
    await logInfo('note');
    const logs = await getLogs();
    expect(logs.map((l) => l.level)).toEqual(['warn', 'info']);
  });

  it('clears all logs', async () => {
    await logError('x');
    expect((await getLogs()).length).toBeGreaterThan(0);
    await clearLogs();
    expect(await getLogs()).toHaveLength(0);
  });

  it('caps stored entries at 200 (newest kept)', async () => {
    for (let i = 0; i < 250; i++) await logError(`e${i}`);
    const logs = await getLogs();
    expect(logs).toHaveLength(200);
    expect(logs[logs.length - 1].message).toBe('e249');
  });
});