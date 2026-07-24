import { describe, it, expect } from 'vitest';
import { synthesize } from './Critic';

describe('Critic Agent', () => {
  describe('synthesize', () => {
    it('should parse valid JSON response into FactCheckResult', () => {
      const validJson = JSON.stringify({
        validityVsTruth: 'The argument is valid and premises are true.',
        rhetoric: {
          ethos: 'Author cites credible sources.',
          pathos: 'Appeals to reader empathy.',
          logos: 'Uses logical structure with examples.',
        },
        fallacies: [
          {
            name: 'Straw Man',
            quote: 'Opponent claims X',
            explanation: 'Misrepresents the actual position.',
          },
        ],
        verdict: 'credible',
        sources: [{ title: 'Source 1', url: 'https://example.com' }],
      });

      const result = synthesize(validJson, 'en');
      
      expect(result.validityVsTruth).toBe('The argument is valid and premises are true.');
      expect(result.rhetoric.ethos).toBe('Author cites credible sources.');
      expect(result.rhetoric.pathos).toBe('Appeals to reader empathy.');
      expect(result.rhetoric.logos).toBe('Uses logical structure with examples.');
      expect(result.fallacies).toHaveLength(1);
      expect(result.fallacies[0].name).toBe('Straw Man');
      expect(result.verdict).toBe('credible');
      expect(result.sources).toHaveLength(1);
      expect(result.sources?.[0].url).toBe('https://example.com');
    });

    it('should handle JSON with markdown code fences', () => {
      const fencedJson = `\`\`\`json
{
  "validityVsTruth": "Valid argument",
  "rhetoric": { "ethos": "E", "pathos": "P", "logos": "L" },
  "fallacies": [],
  "verdict": "credible"
}
\`\`\``;

      const result = synthesize(fencedJson, 'en');
      
      expect(result.validityVsTruth).toBe('Valid argument');
      expect(result.verdict).toBe('credible');
    });

    it('should handle JSON with markdown code fences without language', () => {
      const fencedJson = `\`\`\`
{
  "validityVsTruth": "Valid",
  "rhetoric": { "ethos": "", "pathos": "", "logos": "" },
  "fallacies": [],
  "verdict": "unverified"
}
\`\`\``;

      const result = synthesize(fencedJson, 'en');
      
      expect(result.validityVsTruth).toBe('Valid');
      expect(result.verdict).toBe('unverified');
    });

    it('should return default result for invalid JSON', () => {
      const invalidJson = 'This is not valid JSON at all!';
      
      const result = synthesize(invalidJson, 'en');
      
      expect(result.validityVsTruth).toBe('This is not valid JSON at all!');
      expect(result.rhetoric.ethos).toBe('');
      expect(result.rhetoric.pathos).toBe('');
      expect(result.rhetoric.logos).toBe('');
      expect(result.fallacies).toEqual([]);
      expect(result.verdict).toBe('unverified');
      expect(result.sources).toBeUndefined();
    });

    it('should return default result for empty string', () => {
      const result = synthesize('', 'en');
      
      expect(result.validityVsTruth).toBe('No analysis returned.');
      expect(result.verdict).toBe('unverified');
    });

    it('should handle partial JSON (missing optional fields)', () => {
      const partialJson = JSON.stringify({
        validityVsTruth: 'Only required field provided',
        // rhetoric, fallacies, verdict, sources missing
      });

      const result = synthesize(partialJson, 'en');
      
      expect(result.validityVsTruth).toBe('Only required field provided');
      expect(result.rhetoric.ethos).toBe('');
      expect(result.rhetoric.pathos).toBe('');
      expect(result.rhetoric.logos).toBe('');
      expect(result.fallacies).toEqual([]);
      expect(result.verdict).toBe('unverified');
      expect(result.sources).toBeUndefined();
    });

    it('should default verdict to "unverified" for invalid verdict values', () => {
      const jsonWithInvalidVerdict = JSON.stringify({
        validityVsTruth: 'Test',
        rhetoric: { ethos: '', pathos: '', logos: '' },
        fallacies: [],
        verdict: 'invalid-verdict',
      });

      const result = synthesize(jsonWithInvalidVerdict, 'en');
      
      expect(result.verdict).toBe('unverified');
    });

    it('should accept all valid verdict values', () => {
      const verdicts: ('credible' | 'misleading' | 'unverified')[] = ['credible', 'misleading', 'unverified'];
      
      verdicts.forEach((verdict) => {
        const json = JSON.stringify({
          validityVsTruth: 'Test',
          rhetoric: { ethos: '', pathos: '', logos: '' },
          fallacies: [],
          verdict,
        });
        
        const result = synthesize(json, 'en');
        expect(result.verdict).toBe(verdict);
      });
    });

    it('should handle fallacies array with partial items', () => {
      const jsonWithPartialFallacies = JSON.stringify({
        validityVsTruth: 'Test',
        rhetoric: { ethos: '', pathos: '', logos: '' },
        fallacies: [
          { name: 'Ad Hominem' }, // missing quote and explanation
          { quote: 'Some quote' }, // missing name and explanation
          {}, // empty object
        ],
        verdict: 'misleading',
      });

      const result = synthesize(jsonWithPartialFallacies, 'en');
      
      expect(result.fallacies).toHaveLength(3);
      expect(result.fallacies[0].name).toBe('Ad Hominem');
      expect(result.fallacies[0].quote).toBe('');
      expect(result.fallacies[0].explanation).toBe('');
      expect(result.fallacies[1].name).toBe('');
      expect(result.fallacies[1].quote).toBe('Some quote');
    });

    it('should filter out invalid sources (missing url)', () => {
      const jsonWithSources = JSON.stringify({
        validityVsTruth: 'Test',
        rhetoric: { ethos: '', pathos: '', logos: '' },
        fallacies: [],
        verdict: 'credible',
        sources: [
          { title: 'Valid Source', url: 'https://valid.com' },
          { title: 'Invalid Source' }, // missing url
          { url: 'https://another.com' }, // missing title
        ],
      });

      const result = synthesize(jsonWithSources, 'en');
      
      expect(result.sources).toHaveLength(2);
      expect(result.sources?.[0].title).toBe('Valid Source');
      expect(result.sources?.[0].url).toBe('https://valid.com');
      expect(result.sources?.[1].title).toBe('');
      expect(result.sources?.[1].url).toBe('https://another.com');
    });

    it('should handle language parameter (passed to parseResult)', () => {
      const json = JSON.stringify({
        validityVsTruth: 'Test',
        rhetoric: { ethos: '', pathos: '', logos: '' },
        fallacies: [],
        verdict: 'credible',
      });

      // Language is currently unused in synthesize but passed through
      const resultEn = synthesize(json, 'en');
      const resultZh = synthesize(json, 'zh-CN');
      const resultTw = synthesize(json, 'zh-TW');

      expect(resultEn.verdict).toBe('credible');
      expect(resultZh.verdict).toBe('credible');
      expect(resultTw.verdict).toBe('credible');
    });

    it('should handle Chinese text in JSON', () => {
      const json = JSON.stringify({
        validityVsTruth: '论证有效且前提为真。',
        rhetoric: {
          ethos: '作者引用可信来源。',
          pathos: '诉诸读者同理心。',
          logos: '使用逻辑结构和例子。',
        },
        fallacies: [],
        verdict: 'credible',
      });

      const result = synthesize(json, 'zh-CN');
      
      expect(result.validityVsTruth).toBe('论证有效且前提为真。');
      expect(result.rhetoric.ethos).toBe('作者引用可信来源。');
      expect(result.verdict).toBe('credible');
    });

    it('should extract JSON from surrounding prose', () => {
      const rawResponse = `Here is my analysis:
{
  "validityVsTruth": "Extracted from prose",
  "rhetoric": { "ethos": "E", "pathos": "P", "logos": "L" },
  "fallacies": [],
  "verdict": "credible"
}
That was the analysis.`;

      const result = synthesize(rawResponse, 'en');
      
      expect(result.validityVsTruth).toBe('Extracted from prose');
      expect(result.verdict).toBe('credible');
    });

    it('should return FactCheckResult type with correct structure', () => {
      const json = JSON.stringify({
        validityVsTruth: 'Test',
        rhetoric: { ethos: '', pathos: '', logos: '' },
        fallacies: [],
        verdict: 'credible',
      });

      const result = synthesize(json, 'en');
      
      expect(result).toHaveProperty('validityVsTruth');
      expect(result).toHaveProperty('rhetoric');
      expect(result).toHaveProperty('fallacies');
      expect(result).toHaveProperty('verdict');
      expect(typeof result.validityVsTruth).toBe('string');
      expect(typeof result.rhetoric).toBe('object');
      expect(Array.isArray(result.fallacies)).toBe(true);
      expect(typeof result.verdict).toBe('string');
    });
  });
});