import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Options from './Options';
import { mockChromeStorage } from '../test/setup';
import { logError, clearLogs } from '../logger';

beforeEach(async () => {
  (global as any).chrome = { storage: mockChromeStorage };
  await clearLogs();
});

afterEach(() => {
  cleanup();
});

describe('Options (unit)', () => {
  it('shows empty state when no users are blocked', async () => {
    render(<Options />);
    expect(await screen.findByText('No users blocked.')).toBeInTheDocument();
  });

  it('lists blocked users with name and id', async () => {
    await mockChromeStorage.sync.set({ zhihuBlockedUsers: [{ id: 'u1', name: 'Alice' }] });
    render(<Options />);
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('u1')).toBeInTheDocument();
  });

  it('unblock removes a user and persists the change', async () => {
    await mockChromeStorage.sync.set({ zhihuBlockedUsers: [{ id: 'u1', name: 'Alice' }] });
    render(<Options />);
    const unblockBtn = await screen.findByText('Unblock');
    fireEvent.click(unblockBtn);

    expect(await screen.findByText('No users blocked.')).toBeInTheDocument();
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(0);
  });

  it('clear all empties the block list', async () => {
    await mockChromeStorage.sync.set({
      zhihuBlockedUsers: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ],
    });
    render(<Options />);
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear all'));

    expect(await screen.findByText('No users blocked.')).toBeInTheDocument();
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(0);
  });

  it('shows empty state for the error log', async () => {
    render(<Options />);
    expect(await screen.findByText('No errors logged.')).toBeInTheDocument();
  });

  it('displays logged errors with level and message', async () => {
    await logError('boom', 'background');
    render(<Options />);
    expect(await screen.findByText('boom (background)')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('clear log empties the displayed errors', async () => {
    await logError('boom', 'background');
    render(<Options />);
    expect(await screen.findByText('boom (background)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear log'));
    expect(await screen.findByText('No errors logged.')).toBeInTheDocument();
  });

  it('saves the selected reply language with the fact-check config', async () => {
    render(<Options />);
    const langSelect = await screen.findByLabelText('Reply language');
    fireEvent.mouseDown(langSelect);
    const zhTW = await screen.findByText('中文（繁體）');
    fireEvent.click(zhTW);
    fireEvent.click(screen.getByText('Save'));

    const stored = (await mockChromeStorage.sync.get({ factCheckConfig: null })) as any;
    expect(stored.factCheckConfig?.language).toBe('zh-TW');
  });
});
