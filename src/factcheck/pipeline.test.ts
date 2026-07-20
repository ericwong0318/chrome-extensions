import { describe, it, expect, vi } from 'vitest';
import { runFactCheckPipeline } from './pipeline';
import { FactCheckResult } from './prompt';

describe('Fact-Check Multi-Agent Pipeline', () => {
  it('correctly de-noises and passes through Parser, Logic, Bias, and Critic', async () => {
    // A string representing a valid structured JSON output from Critic (which parses Bias output)
    const mockJson = JSON.stringify({
      validityVsTruth: 'Valid but biased arguments',
      rhetoric: { ethos: 'High', pathos: 'Medium', logos: 'Low' },
      fallacies: [{ name: 'False dilemma', quote: 'either/or', explanation: 'Oversimplifies options' }],
      verdict: 'misleading',
    });

    const onFactCheckMock = vi.fn();

    // Since the Critic synthesizes whatever is passed from Bias, and Bias passes what Logic returns,
    // and Logic returns parser's cleanedText, the pipeline will synthesize the parser output.
    // If the parser output is our mockJson (cleaned/de-noised), the Critic should parse it successfully.
    const result = await runFactCheckPipeline(mockJson, 'en', onFactCheckMock);

    expect(onFactCheckMock).not.toHaveBeenCalled();
    expect(result.verdict).toBe('misleading');
    expect(result.validityVsTruth).toBe('Valid but biased arguments');
    expect(result.rhetoric.ethos).toBe('High');
    expect(result.fallacies[0].name).toBe('False dilemma');
  });

  it('falls back to onFactCheck provider when Critic cannot synthesize a valid result', async () => {
    const rawText = 'This is raw unparseable text';
    const mockProviderResult: FactCheckResult = {
      validityVsTruth: 'Verified truth',
      rhetoric: { ethos: '', pathos: '', logos: '' },
      fallacies: [],
      verdict: 'credible',
    };

    const onFactCheckMock = vi.fn().mockResolvedValue(mockProviderResult);

    const result = await runFactCheckPipeline(rawText, 'en', onFactCheckMock);

    expect(onFactCheckMock.mock.calls[0][0]).toBe(rawText);
    expect(result.verdict).toBe('credible');
    expect(result.validityVsTruth).toBe('Verified truth');
  });

  it('returns appropriate unverified error layout when provider returns error', async () => {
    const rawText = 'Another raw text';
    const onFactCheckMock = vi.fn().mockResolvedValue({ error: 'Failed to fetch model output' });

    const result = await runFactCheckPipeline(rawText, 'en', onFactCheckMock);

    expect(onFactCheckMock.mock.calls[0][0]).toBe(rawText);
    expect(result.verdict).toBe('unverified');
    expect(result.validityVsTruth).toBe('Failed to fetch model output');
  });
});
