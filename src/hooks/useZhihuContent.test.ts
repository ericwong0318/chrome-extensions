import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZhihuContent, getZhihuContent, CONTENT_SELECTORS, ZhihuContent } from './useZhihuContent';
import { logError } from '../features/logging';

// Mock the logging module
vi.mock('../features/logging', () => ({
  logError: vi.fn(),
}));

describe('useZhihuContent', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Use fake timers
    vi.useFakeTimers();
    
    // Clear DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('getZhihuContent', () => {
    it('should extract Zhihu content from DOM elements', () => {
      const content1 = document.createElement('div');
      content1.className = 'RichText';
      content1.innerText = 'This is a long enough content for fact checking purposes';
      content1.setAttribute('data-id', 'content1');
      
      const content2 = document.createElement('div');
      content2.className = 'ContentItem-title';
      content2.innerText = 'Another long content that should be captured by the extractor';
      
      document.body.appendChild(content1);
      document.body.appendChild(content2);

      const contents = getZhihuContent();
      
      expect(contents.length).toBeGreaterThanOrEqual(2);
      const foundContent1 = contents.find(c => c.text.includes('long enough content'));
      const foundContent2 = contents.find(c => c.text.includes('Another long content'));
      expect(foundContent1).toBeDefined();
      expect(foundContent2).toBeDefined();

      document.body.removeChild(content1);
      document.body.removeChild(content2);
    });

    it('should skip short content', () => {
      const shortContent = document.createElement('div');
      shortContent.className = 'RichText';
      shortContent.innerText = 'Short';
      shortContent.setAttribute('data-id', 'short');
      
      document.body.appendChild(shortContent);

      const contents = getZhihuContent();
      
      const found = contents.find(c => c.id === 'short');
      expect(found).toBeUndefined();

      document.body.removeChild(shortContent);
    });

    it('should deduplicate by anchor', () => {
      const anchor = document.createElement('div');
      anchor.className = 'List-item';
      anchor.setAttribute('data-id', 'anchor1');
      
      const content1 = document.createElement('div');
      content1.className = 'RichText';
      content1.innerText = 'First version of the content';
      
      const content2 = document.createElement('div');
      content2.className = 'RichText';
      content2.innerText = 'Second version of the content which is longer';
      
      anchor.appendChild(content1);
      anchor.appendChild(content2);
      document.body.appendChild(anchor);

      const contents = getZhihuContent();
      
      // Should only have one entry for this anchor, with the longer text
      const anchorContents = contents.filter(c => c.element === anchor || c.id === 'anchor1');
      expect(anchorContents.length).toBe(1);
      expect(anchorContents[0].text).toBe('Second version of the content which is longer');

      document.body.removeChild(anchor);
    });

    it('should handle empty or whitespace content', () => {
      const emptyContent = document.createElement('div');
      emptyContent.className = 'RichText';
      emptyContent.innerText = '   ';
      emptyContent.setAttribute('data-id', 'empty');
      
      const whitespaceContent = document.createElement('div');
      whitespaceContent.className = 'RichText';
      whitespaceContent.innerText = '\n\t\r';
      whitespaceContent.setAttribute('data-id', 'whitespace');
      
      document.body.appendChild(emptyContent);
      document.body.appendChild(whitespaceContent);

      const contents = getZhihuContent();
      
      expect(contents.find(c => c.id === 'empty')).toBeUndefined();
      expect(contents.find(c => c.id === 'whitespace')).toBeUndefined();

      document.body.removeChild(emptyContent);
      document.body.removeChild(whitespaceContent);
    });

    it('should use text slice as id when no data-id attribute', () => {
      const content = document.createElement('div');
      content.className = 'RichText';
      content.innerText = 'This is a content without data id attribute';
      // No data-id attribute
      
      document.body.appendChild(content);

      const contents = getZhihuContent();
      
      const found = contents.find(c => c.text === 'This is a content without data id attribute');
      expect(found).toBeDefined();
      // The ID should be the first 40 characters of the text
      expect(found?.id).toBe('This is a content without data id attrib');

      document.body.removeChild(content);
    });

    it('should handle missing elements gracefully', () => {
      // Should not throw when no elements match selectors
      const contents = getZhihuContent();
      expect(Array.isArray(contents)).toBe(true);
    });
  });

  describe('useZhihuContent hook', () => {
    it('should initialize with empty contents', () => {
      const { result } = renderHook(() => useZhihuContent());
      
      expect(result.current.contents).toEqual([]);
    });

    it('should scan for content on mount', () => {
      const content = document.createElement('div');
      content.className = 'RichText';
      content.innerText = 'Test content for scanning that is long enough';
      content.setAttribute('data-id', 'test1');
      document.body.appendChild(content);

      const { result } = renderHook(() => useZhihuContent());
      
      // The effect runs asynchronously, so we wait
      act(() => {
        // Trigger a scan by advancing timers
        vi.advanceTimersByTime(300);
      });

      expect(result.current.contents.length).toBeGreaterThan(0);
      const found = result.current.contents.find(c => c.text.includes('Test content for scanning'));
      expect(found).toBeDefined();

      document.body.removeChild(content);
    });

    it('should provide setContents function', () => {
      const { result } = renderHook(() => useZhihuContent());
      
      const mockContents: ZhihuContent[] = [
        { id: 'manual1', text: 'Manually set content', element: document.createElement('div') }
      ];
      
      act(() => {
        result.current.setContents(mockContents);
      });

      expect(result.current.contents).toEqual(mockContents);
    });

    it('should cleanup observer on unmount', () => {
      const { unmount } = renderHook(() => useZhihuContent());
      
      // Should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('CONTENT_SELECTORS', () => {
    it('should contain expected selectors', () => {
      expect(CONTENT_SELECTORS).toContain('.RichText');
      expect(CONTENT_SELECTORS).toContain('.ContentItem-title');
      expect(CONTENT_SELECTORS).toContain('.AnswerCard');
      expect(CONTENT_SELECTORS).toContain('.QuestionAnswer-content');
    });
  });

  describe('Error handling', () => {
    it('should log error and return empty array on exception', () => {
      // Mock querySelectorAll to throw
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = vi.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      const contents = getZhihuContent();
      
      expect(contents).toEqual([]);
      expect(logError).toHaveBeenCalledWith('Failed to collect Zhihu content', 'Error: DOM error');

      document.querySelectorAll = originalQuerySelectorAll;
    });
  });
});