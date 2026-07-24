import { describe, it, expect } from 'vitest';
import { runLogic } from './Logic';
import { ParsedInput } from './Parser';

describe('Logic Agent', () => {
  describe('runLogic', () => {
    it('should return cleaned text from parsed input', async () => {
      const input: ParsedInput = {
        cleanedText: 'This is a test argument.',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(result).toBe('This is a test argument.');
    });

    it('should handle empty string input', async () => {
      const input: ParsedInput = {
        cleanedText: '',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(result).toBe('');
    });

    it('should handle Chinese text', async () => {
      const input: ParsedInput = {
        cleanedText: '这是一个测试论点。',
        resources: [],
      };

      const result = await runLogic(input, 'zh');
      expect(result).toBe('这是一个测试论点。');
    });

    it('should handle text with URLs', async () => {
      const input: ParsedInput = {
        cleanedText: 'Check out https://example.com for evidence.',
        resources: ['https://example.com'],
      };

      const result = await runLogic(input, 'en');
      expect(result).toContain('https://example.com');
    });

    it('should handle markdown-like content', async () => {
      const input: ParsedInput = {
        cleanedText: '**Bold claim** with *emphasis*.',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(result).toBe('**Bold claim** with *emphasis*.');
    });

    it('should handle multiline text', async () => {
      const input: ParsedInput = {
        cleanedText: 'Premise 1\nPremise 2\nConclusion',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(result).toBe('Premise 1\nPremise 2\nConclusion');
    });

    it('should accept language parameter (currently unused)', async () => {
      const input: ParsedInput = {
        cleanedText: 'Test argument',
        resources: [],
      };

      const resultEn = await runLogic(input, 'en');
      const resultZh = await runLogic(input, 'zh');
      const resultJa = await runLogic(input, 'ja');

      expect(resultEn).toBe('Test argument');
      expect(resultZh).toBe('Test argument');
      expect(resultJa).toBe('Test argument');
    });

    it('should handle complex argument structure', async () => {
      const input: ParsedInput = {
        cleanedText: 'All humans are mortal. Socrates is human. Therefore, Socrates is mortal.',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(result).toContain('All humans are mortal');
      expect(result).toContain('Socrates is mortal');
    });

    it('should return string type', async () => {
      const input: ParsedInput = {
        cleanedText: 'Test',
        resources: [],
      };

      const result = await runLogic(input, 'en');
      expect(typeof result).toBe('string');
    });

    it('should handle resources array (currently unused)', async () => {
      const input: ParsedInput = {
        cleanedText: 'Argument with sources.',
        resources: ['https://source1.com', 'https://source2.com'],
      };

      const result = await runLogic(input, 'en');
      expect(result).toBe('Argument with sources.');
    });
  });
});