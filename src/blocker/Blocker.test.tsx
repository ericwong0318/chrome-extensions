import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Blocker from './Blocker';
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

// Seed a Zhihu answer body so getZhihuContent() picks it up. The content block
// must have enough text (>20 chars) to be collected. We also include an author
// link so the Block controls are rendered, letting us assert the Fact Check
// button is placed next to the Block button.
function seedAnswerDom() {
  document.body.innerHTML = '';
  const listItem = document.createElement('div');
  listItem.className = 'List-item ContentItem';
  const authorInfo = document.createElement('div');
  authorInfo.className = 'AuthorInfo-head';
  const link = document.createElement('a');
  link.className = 'UserLink-link';
  link.setAttribute('href', '/people/alice');
  link.textContent = 'Alice';
  authorInfo.appendChild(link);
  listItem.appendChild(authorInfo);
  const rich = document.createElement('div');
  rich.className = 'RichText';
  const p = document.createElement('p');
  p.textContent =
    'All politicians are corrupt and 90% of people agree with this claim without question.';
  rich.appendChild(p);
  listItem.appendChild(rich);
  document.body.appendChild(listItem);
  return { listItem, link, rich, p };
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

describe('Blocker (unit)', () => {
  it('renders a Block button next to the detected user name', async () => {
    seedZhihuDom();
    render(<Blocker />);
    // The inline control is portaled right after the user link.
    const link = document.querySelector('.UserLink-link') as HTMLElement;
    await waitFor(() => {
      const next = link.nextElementSibling as HTMLElement | null;
      expect(next?.querySelector('button')?.textContent).toBe('Block');
    });
  });

  it('blocks a user: hides content and persists to storage', async () => {
    const { listItem, link } = seedZhihuDom();
    render(<Blocker />);
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

  it('unblock removes the user from storage and shows content', async () => {
    const { listItem, link } = seedZhihuDom();
    render(<Blocker />);
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

  it('injects a Fact Check button next to the Block button', async () => {
    const { listItem, link, rich } = seedAnswerDom();
    render(<Blocker />);
    const factCheckBtn = await waitFor(() => {
      const btn = screen.getByText('Fact Check');
      expect(btn).toBeInTheDocument();
      return btn;
    });
    // The button is portaled into a container next to the Block button.
    const container = document.querySelector('.zhihu-factcheck-inline');
    expect(container).not.toBeNull();
    expect(container?.contains(factCheckBtn)).toBe(true);

    // The fact-check container must sit right next to the Block controls
    // container (the inline block container), never at the first sentence of
    // the answer body.
    const blockContainer = document.querySelector('.zhihu-block-inline');
    expect(blockContainer).not.toBeNull();
    expect(blockContainer?.nextElementSibling).toBe(container);
    // It must NOT be inside the answer body (rich text / <p>).
    expect(rich.contains(container)).toBe(false);
    expect(listItem.contains(container)).toBe(true);
    // The Block button is also present next to the author link.
    expect(link.nextElementSibling).toBe(blockContainer);
  });

  it('renders exactly one Fact Check button for a collapsed answer with multiple matching content selectors', async () => {
    // A collapsed Zhihu answer often matches several CONTENT_SELECTORS
    // (.ContentItem-title, .RichText, .AnswerCard) that all belong to the same
    // answer. We must not create one button per match.
    document.body.innerHTML = '';
    const listItem = document.createElement('div');
    listItem.className = 'List-item ContentItem';
    const authorInfo = document.createElement('div');
    authorInfo.className = 'AuthorInfo-head';
    const link = document.createElement('a');
    link.className = 'UserLink-link';
    link.setAttribute('href', '/people/alice');
    link.textContent = 'Alice';
    authorInfo.appendChild(link);
    listItem.appendChild(authorInfo);

    const title = document.createElement('h2');
    title.className = 'ContentItem-title';
    title.textContent = 'Why are politicians corrupt and what should we do about it?';
    listItem.appendChild(title);

    const answerCard = document.createElement('div');
    answerCard.className = 'AnswerCard';
    const rich = document.createElement('div');
    rich.className = 'RichText';
    const p = document.createElement('p');
    p.textContent =
      'All politicians are corrupt and 90% of people agree with this claim without question.';
    rich.appendChild(p);
    answerCard.appendChild(rich);
    listItem.appendChild(answerCard);
    document.body.appendChild(listItem);

    render(<Blocker />);

    // Exactly one Fact Check button, even though 3 selectors matched.
    await waitFor(() => {
      expect(screen.getAllByText('Fact Check')).toHaveLength(1);
    });
    const containers = document.querySelectorAll('.zhihu-factcheck-inline');
    expect(containers).toHaveLength(1);
  });
});
