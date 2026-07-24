import { describe, it, expect } from 'vitest';
import { parse } from './Parser';

describe('Parser Agent', () => {
  describe('parse', () => {
    it('should trim whitespace from input', () => {
      const input = '  Hello World  ';
      const result = parse(input);
      expect(result.cleanedText).toBe('Hello World');
    });

    it('should collapse multiple line breaks into single ones', () => {
      const input = 'Line 1\n\n\nLine 2\n\n\n\nLine 3';
      const result = parse(input);
      expect(result.cleanedText).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle mixed whitespace and line breaks', () => {
      const input = '  \n\n  Line 1  \n\n  Line 2  \n\n  ';
      const result = parse(input);
      // Parser only trims outer whitespace and collapses multiple newlines
      // It does not trim individual lines
      expect(result.cleanedText).toBe('Line 1  \n  Line 2');
    });

    it('should return empty resources array (placeholder)', () => {
      const input = 'Some text with https://example.com link';
      const result = parse(input);
      expect(result.resources).toEqual([]);
    });

    it('should handle empty string', () => {
      const input = '';
      const result = parse(input);
      expect(result.cleanedText).toBe('');
      expect(result.resources).toEqual([]);
    });

    it('should handle string with only whitespace', () => {
      const input = '   \n\n   ';
      const result = parse(input);
      expect(result.cleanedText).toBe('');
    });

    it('should handle single line without breaks', () => {
      const input = 'Single line text';
      const result = parse(input);
      expect(result.cleanedText).toBe('Single line text');
    });

    it('should handle language parameter (currently unused)', () => {
      const input = 'Text with Chinese 中文';
      const result = parse(input, 'zh');
      expect(result.cleanedText).toBe('Text with Chinese 中文');
    });

    it('should preserve URLs in cleaned text', () => {
      const input = 'Check out https://example.com for more info';
      const result = parse(input);
      expect(result.cleanedText).toContain('https://example.com');
    });

    it('should preserve markdown-like content', () => {
      const input = '**Bold** and *italic* text';
      const result = parse(input);
      expect(result.cleanedText).toBe('**Bold** and *italic* text');
    });

    it('should handle Chinese text with punctuation', () => {
      const input = '这是中文文本。包含标点符号。';
      const result = parse(input);
      expect(result.cleanedText).toBe('这是中文文本。包含标点符号。');
    });

    it('should return ParsedInput type with correct structure', () => {
      const input = 'Test';
      const result = parse(input);
      
      expect(result).toHaveProperty('cleanedText');
      expect(result).toHaveProperty('resources');
      expect(typeof result.cleanedText).toBe('string');
      expect(Array.isArray(result.resources)).toBe(true);
    });
  });
});