import { describe, it, expect } from 'vitest';
import { normalizeFactCheckConfigs } from './storage';

describe('normalizeFactCheckConfigs', () => {
  it('returns the configured providers when factCheckConfigs is present', () => {
    const configs = normalizeFactCheckConfigs(
      [{ provider: 'openai', apiKey: 'abc', model: 'gpt-4o-mini', language: 'zh-TW' }],
      null
    );

    expect(configs).toEqual([
      {
        provider: 'openai',
        apiKey: 'abc',
        model: 'gpt-4o-mini',
        language: 'zh-TW',
      },
    ]);
  });

  it('falls back to a legacy factCheckConfig when factCheckConfigs is empty', () => {
    const configs = normalizeFactCheckConfigs([], {
      provider: 'claude',
      apiKey: 'legacy-key',
      model: 'claude-3-5-sonnet-latest',
      language: 'en',
    });

    expect(configs).toEqual([
      {
        provider: 'claude',
        apiKey: 'legacy-key',
        model: 'claude-3-5-sonnet-latest',
        language: 'en',
      },
    ]);
  });

  it('ignores invalid provider entries and falls back to legacy config', () => {
    const configs = normalizeFactCheckConfigs(
      [{ provider: '', apiKey: 'invalid' }, { provider: 'unknown', apiKey: 'invalid' }],
      { provider: 'openai', apiKey: 'good', model: 'gpt-4o-mini' }
    );

    expect(configs).toEqual([
      {
        provider: 'openai',
        apiKey: 'good',
        model: 'gpt-4o-mini',
      },
    ]);
  });

  it('returns an empty array if no valid configs exist', () => {
    const configs = normalizeFactCheckConfigs(null, { provider: '', apiKey: 'invalid' });
    expect(configs).toEqual([]);
  });
});
