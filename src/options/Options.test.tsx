import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Options from './Options';
import { mockChromeStorage } from '../test/setup';

beforeEach(() => {
  (global as any).chrome = { storage: mockChromeStorage };
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
});