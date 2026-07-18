import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Overlay from './Overlay';
import { mockChromeStorage } from '../test/setup';

// Build a minimal fake Zhihu DOM. The content script's getZhihuUsers() only
// matches .UserLink-link inside an .AuthorInfo-head (or data-za-detail-view-path)
// ancestor, so we mirror that structure here.
function seedZhihuDom() {
  document.body.innerHTML = '';
  const listItem = document.createElement('div');
  listItem.className = 'List-item';
  const authorInfo = document.createElement('div');
  authorInfo.className = 'AuthorInfo-head';
  const link = document.createElement('a');
  link.className = 'UserLink-link';
  link.setAttribute('href', '/people/alice');
  link.textContent = 'Alice';
  authorInfo.appendChild(link);
  listItem.appendChild(authorInfo);
  document.body.appendChild(listItem);
  return { listItem, link };
}

beforeEach(() => {
  (global as any).chrome = {
    storage: mockChromeStorage,
    runtime: { sendMessage: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('Overlay (unit)', () => {
  it('renders a Block button next to the detected user name', async () => {
    seedZhihuDom();
    render(<Overlay />);
    // The inline control is portaled right after the user link.
    const link = document.querySelector('.UserLink-link') as HTMLElement;
    await waitFor(() => {
      const next = link.nextElementSibling as HTMLElement | null;
      expect(next?.querySelector('button')?.textContent).toBe('Block');
    });
  });

  it('blocks a user: hides content and persists to storage', async () => {
    const { listItem, link } = seedZhihuDom();
    render(<Overlay />);
    const blockBtn = await waitFor(() => {
      const next = link.nextElementSibling as HTMLElement;
      return next.querySelector('button') as HTMLButtonElement;
    });
    fireEvent.click(blockBtn);

    await waitFor(() => {
      expect(listItem.style.display).toBe('none');
    });
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(1);
    expect(stored.zhihuBlockedUsers[0].id).toBe('/people/alice');
  });

  it('unlock reveals content, lock re-hides it', async () => {
    const { listItem, link } = seedZhihuDom();
    render(<Overlay />);
    const blockBtn = await waitFor(() => (link.nextElementSibling as HTMLElement).querySelector('button') as HTMLButtonElement);
    fireEvent.click(blockBtn);

    const unlockBtn = await waitFor(() => (link.nextElementSibling as HTMLElement).querySelector('button') as HTMLButtonElement);
    expect(unlockBtn.textContent).toBe('Unlock');
    fireEvent.click(unlockBtn);

    await waitFor(() => expect(listItem.style.display).toBe(''));

    const lockBtn = await waitFor(() => (link.nextElementSibling as HTMLElement).querySelector('button') as HTMLButtonElement);
    expect(lockBtn.textContent).toBe('Lock');
    fireEvent.click(lockBtn);

    await waitFor(() => expect(listItem.style.display).toBe('none'));
  });

  it('unblock removes the user from storage and shows content', async () => {
    const { listItem, link } = seedZhihuDom();
    render(<Overlay />);
    const blockBtn = await waitFor(() => (link.nextElementSibling as HTMLElement).querySelector('button') as HTMLButtonElement);
    fireEvent.click(blockBtn);

    const unblockBtn = await waitFor(() => {
      const buttons = (link.nextElementSibling as HTMLElement).querySelectorAll('button');
      return buttons[buttons.length - 1] as HTMLButtonElement; // "Unblock"
    });
    expect(unblockBtn.textContent).toBe('Unblock');
    fireEvent.click(unblockBtn);

    await waitFor(() => expect(listItem.style.display).toBe(''));
    const stored = (await mockChromeStorage.sync.get({ zhihuBlockedUsers: [] })) as any;
    expect(stored.zhihuBlockedUsers).toHaveLength(0);
  });
});