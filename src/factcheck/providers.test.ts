import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callProvider } from './providers';
import { parseResult, SYSTEM_PROMPT } from './prompt';

// Mock global fetch so we can assert the request shape per provider without
// hitting the network.
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

describe('callProvider', () => {
  it('returns an error when no provider is configured', async () => {
    const res = await callProvider('some text', { provider: '' as any });
    expect(res.ok).toBe(false);
  });

  it('returns an error when a cloud provider has no API key', async () => {
    const res = await callProvider('text', { provider: 'claude' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/API key/i);
  });

  it('posts to the Claude endpoint with the shared system prompt', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"verdict":"unverified"}' }] }),
    });
    const res = await callProvider('claim', { provider: 'claude', apiKey: 'k', model: 'm' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('k');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('m');
    expect(body.system).toBe(SYSTEM_PROMPT);
    expect(res.ok).toBe(true);
  });

  it('posts to the Gemini endpoint with the key in the query string', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
    });
    await callProvider('claim', { provider: 'gemini', apiKey: 'gk', model: 'gm' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('key=gk');
    expect(JSON.parse(init.body).systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
  });

  it('posts to a local OpenAI-compatible server without an API key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"credible"}' } }] }),
    });
    const res = await callProvider('claim', { provider: 'local', model: 'llama3.1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.headers['Authorization']).toBeUndefined();
    expect(res.ok).toBe(true);
  });

  it('posts to the Other (OpenAI-compatible) endpoint with a bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"misleading"}' } }] }),
    });
    await callProvider('claim', {
      provider: 'other',
      apiKey: 'ok',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer ok');
  });

  it('posts to OpenRouter with a bearer token and default base URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"credible"}' } }] }),
    });
    const res = await callProvider('claim', { provider: 'openrouter', apiKey: 'ork' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer ork');
    expect(res.ok).toBe(true);
  });

  it('returns an error when OpenRouter has no API key', async () => {
    const res = await callProvider('claim', { provider: 'openrouter' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/OpenRouter/i);
  });

  it('posts to OpenAI with a bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"credible"}' } }] }),
    });
    const res = await callProvider('claim', { provider: 'openai', apiKey: 'oai' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer oai');
    expect(res.ok).toBe(true);
  });

  it('posts to DeepSeek with a bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"unverified"}' } }] }),
    });
    const res = await callProvider('claim', { provider: 'deepseek', apiKey: 'ds' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer ds');
    expect(res.ok).toBe(true);
  });

  it('returns an error when DeepSeek has no API key', async () => {
    const res = await callProvider('claim', { provider: 'deepseek' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/DeepSeek/i);
  });

  it('returns an error when OpenAI has no API key', async () => {
    const res = await callProvider('claim', { provider: 'openai' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/OpenAI/i);
  });

  it('surfaces a provider HTTP error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const res = await callProvider('claim', { provider: 'claude', apiKey: 'bad' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Authentication failed \(401\)/);
  });

  it('returns a clean message for a 429 rate-limit error with a JSON body', async () => {
    const body = JSON.stringify({
      error: {
        message:
          'Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day',
        code: 429,
      },
    });
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => body });
    const res = await callProvider('claim', { provider: 'openrouter', apiKey: 'ork' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/^Rate limit exceeded\./);
      // The raw JSON payload must not be shown to the user.
      expect(res.error).not.toContain('"error"');
      expect(res.error).toContain('free-models-per-day');
    }
  });

  it('falls back to a generic message for an unparseable error body', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => '<html>oops</html>' });
    const res = await callProvider('claim', { provider: 'openai', apiKey: 'oai' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/server error \(500\)/);
  });

  it('includes a Simplified Chinese instruction in the prompt when language is zh-CN', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"credible"}' } }] }),
    });
    await callProvider('claim', { provider: 'openai', apiKey: 'oai', language: 'zh-CN' });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    const userMsg = body.messages.find((m: any) => m.role === 'user');
    expect(userMsg.content).toContain('中文（简体）');
  });

  it('includes an English instruction in the prompt when language is en', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"verdict":"credible"}' } }] }),
    });
    await callProvider('claim', { provider: 'openai', apiKey: 'oai', language: 'en' });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    const userMsg = body.messages.find((m: any) => m.role === 'user');
    expect(userMsg.content).toContain('in English');
  });
});

describe('parseResult', () => {
  it('parses a fenced JSON response into a FactCheckResult', () => {
    const raw = '```json\n{"validityVsTruth":"x","verdict":"credible","fallacies":[]}\n```';
    const r = parseResult(raw);
    expect(r.verdict).toBe('credible');
    expect(r.validityVsTruth).toBe('x');
  });

  it('falls back to a plain text result when JSON is malformed', () => {
    const r = parseResult('not json at all');
    expect(r.verdict).toBe('unverified');
    expect(r.validityVsTruth).toContain('not json');
  });

  it('coerces unknown verdicts to unverified', () => {
    const r = parseResult('{"verdict":"banana"}');
    expect(r.verdict).toBe('unverified');
  });

  it('extracts rhetoric and fallacies', () => {
    const r = parseResult(
      JSON.stringify({
        validityVsTruth: 'v',
        rhetoric: { ethos: 'e', pathos: 'p', logos: 'l' },
        fallacies: [{ name: 'Straw man', quote: 'q', explanation: 'ex' }],
        verdict: 'misleading',
      })
    );
    expect(r.rhetoric.ethos).toBe('e');
    expect(r.fallacies[0].name).toBe('Straw man');
  });
});