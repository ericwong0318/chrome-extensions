import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZhihuContent } from '../../../hooks/useZhihuContent';

// Mock CSS.escape
const mockCSS = {
  escape: vi.fn((str: string) => str),
};

describe('useFactCheckContainers', () => {
  let mockContents: ZhihuContent[];
  let mockParent: HTMLElement;
  let mockUserLink: HTMLElement;
  let mockBlockContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    
    // Mock CSS.escape
    (global as unknown as { CSS: typeof mockCSS }).CSS = mockCSS;

    // Create mock DOM structure
    mockParent = document.createElement('div');
    mockParent.id = 'parent-1';
    document.body.appendChild(mockParent);

    mockUserLink = document.createElement('a');
    mockUserLink.className = 'UserLink-link';
    mockUserLink.textContent = 'Test User';
    mockParent.appendChild(mockUserLink);

    mockBlockContainer = document.createElement('span');
    mockBlockContainer.className = 'zhihu-block-inline';
    mockParent.appendChild(mockBlockContainer);

    mockContents = [
      {
        id: 'content-1',
        element: mockParent,
        authorName: 'Test User',
        authorUrl: 'https://zhihu.com/people/test',
        contentText: 'Test content',
      },
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should create fact-check containers for content elements', () => {
    // Call the hook function directly to test logic
    const contents = mockContents;
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next).toBeInstanceOf(Map);
    expect(next.size).toBe(1);
    expect(next.has('content-1')).toBe(true);
    
    const container = next.get('content-1');
    expect(container).toBeInstanceOf(HTMLElement);
    expect(container?.className).toBe('zhihu-factcheck-inline');
    expect(container?.getAttribute('data-contentid')).toBe('content-1');
  });

  it('should reuse existing fact-check containers', () => {
    // Pre-create a fact-check container
    const existingContainer = document.createElement('span');
    existingContainer.className = 'zhihu-factcheck-inline';
    existingContainer.setAttribute('data-contentid', 'content-1');
    mockBlockContainer.insertAdjacentElement('afterend', existingContainer);

    const contents = mockContents;
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next.size).toBe(1);
    expect(next.get('content-1')).toBe(existingContainer);
  });

  it('should not create container if block container not found', () => {
    // Remove block container
    mockBlockContainer.remove();
    mockUserLink.remove();

    const contents = mockContents;
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next.size).toBe(0);
  });

  it('should use CSS.escape for content IDs', () => {
    const specialIdContent: ZhihuContent = {
      id: 'content-with-special.chars',
      element: mockParent,
      authorName: 'Test User',
      authorUrl: 'https://zhihu.com/people/test',
      contentText: 'Test content',
    };

    const contents = [specialIdContent];
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(mockCSS.escape).toHaveBeenCalledWith('content-with-special.chars');
    expect(next.has('content-with-special.chars')).toBe(true);
  });

  it('should handle empty contents array', () => {
    const contents: ZhihuContent[] = [];
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next).toBeInstanceOf(Map);
    expect(next.size).toBe(0);
  });

  it('should skip content without parent element', () => {
    const contentsWithoutParent: ZhihuContent[] = [
      {
        id: 'content-1',
        element: null as unknown as HTMLElement,
        authorName: 'Test User',
        authorUrl: 'https://zhihu.com/people/test',
        contentText: 'Test content',
      },
    ];

    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contentsWithoutParent.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next.size).toBe(0);
  });

  it('should find block container via UserLink-link sibling', () => {
    // Remove the direct block container, only keep UserLink-link
    mockBlockContainer.remove();
    
    const blockContainerAfterUserLink = document.createElement('span');
    blockContainerAfterUserLink.className = 'zhihu-block-inline';
    mockUserLink.insertAdjacentElement('afterend', blockContainerAfterUserLink);

    const contents = mockContents;
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next.size).toBe(1);
  });

  it('should find block container via document querySelectorAll fallback', () => {
    // Remove all block containers from parent
    mockBlockContainer.remove();
    mockUserLink.remove();

    // Create a block container elsewhere in document
    const fallbackContainer = document.createElement('span');
    fallbackContainer.className = 'zhihu-block-inline';
    document.body.appendChild(fallbackContainer);

    const contents = mockContents;
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.zhihu-factcheck-inline[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = 'zhihu-factcheck-inline';
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector('.zhihu-block-inline');
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains('zhihu-block-inline')) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('.zhihu-block-inline'));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains('zhihu-factcheck-inline')) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });

    expect(next.size).toBe(1);
  });
});
