// Provider dispatch for the online AI fact-check feature. Each provider
// receives the SAME shared prompt (see prompt.ts) so the analysis framework
// (Validity/Truth, Ethos/Pathos/Logos, Fallacies) is consistent. The background
// service worker calls callProvider(); the content script never sees the key.

import { SYSTEM_PROMPT, buildUserPrompt, parseResult, FactCheckResult, FactCheckLanguage } from './prompt';

export type ProviderId =
  | 'claude'
  | 'local'
  | 'gemini'
  | 'openai'
  | 'deepseek'
  | 'openrouter'
  | 'other';

export type FactCheckConfig = {
  provider: ProviderId;
  // API key for cloud providers. "local" and "other" may omit it.
  apiKey?: string;
  // Model name, e.g. "claude-3-5-sonnet-latest", "llama3.1", "deepseek-chat".
  model?: string;
  // Base URL override (used by "local" and "other").
  baseUrl?: string;
  // Language the AI reply should be written in.
  language?: FactCheckLanguage;
};

export type FactCheckResponse =
  | { ok: true; result: FactCheckResult }
  | { ok: false; error: string };

const DEFAULT_LOCAL_URL = 'http://localhost:11434/v1';
const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1';
const DEFAULT_DEEPSEEK_URL = 'https://api.deepseek.com/v1';
const DEFAULT_OPENROUTER_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OTHER_URL = 'https://api.openai.com/v1';

// Turn a non-OK provider HTTP response into a clean, user-facing error message.
// Provider error bodies are often raw JSON (e.g. {"error":{"message":...}}); we
// extract the meaningful text instead of dumping the whole payload to the user.
const formatProviderError = (status: number, detail: string): string => {
  let message = '';
  try {
    const parsed = JSON.parse(detail);
    const errObj = parsed?.error ?? parsed;
    message =
      errObj?.message ||
      errObj?.error?.message ||
      (typeof errObj === 'string' ? errObj : '');
  } catch {
    message = detail.trim();
  }
  message = message.slice(0, 200).trim();

  if (status === 429) {
    return `Rate limit exceeded. ${message || 'The provider has reached its request limit.'} Try again later or upgrade your plan.`;
  }
  if (status === 401 || status === 403) {
    return `Authentication failed (${status}). ${message || 'Check your API key in Options.'}`;
  }
  if (status === 404) {
    return `Provider endpoint not found (404). ${message || 'Check the model name and base URL in Options.'}`;
  }
  if (status >= 500) {
    return `The provider returned a server error (${status}). ${message || 'Please try again later.'}`;
  }
  return `Provider returned ${status}. ${message || 'Please try again.'}`;
};

// Pull the textual completion out of each provider's response shape.
const extractText = (provider: ProviderId, data: any): string => {
  if (provider === 'claude') {
    // data.content is an array of blocks; concatenate text blocks.
    const blocks: any[] = Array.isArray(data?.content) ? data.content : [];
    return blocks
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  if (provider === 'gemini') {
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p?.text ?? '').join('\n');
  }
  // All OpenAI-compatible providers (local, openai, deepseek, openrouter,
  // other) return choices[0].message.content.
  return data?.choices?.[0]?.message?.content ?? '';
};

export const callProvider = async (
  text: string,
  config: FactCheckConfig
): Promise<FactCheckResponse> => {
  if (!config || !config.provider) {
    return { ok: false, error: 'No fact-check provider configured.' };
  }

  const userPrompt = buildUserPrompt(text, config.language);
  const model = config.model || defaultModel(config.provider);

  try {
    let url: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: string;

    switch (config.provider) {
      case 'claude': {
        if (!config.apiKey) return { ok: false, error: 'Claude API key is missing.' };
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = JSON.stringify({
          model,
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });
        break;
      }
      case 'gemini': {
        if (!config.apiKey) return { ok: false, error: 'Gemini API key is missing.' };
        const base = config.baseUrl || 'https://generativelanguage.googleapis.com';
        url = `${base}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
        body = JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        });
        break;
      }
      case 'local': {
        // OpenAI-compatible local server (Ollama, local Qwen/DashScope, llama.cpp, …).
        // No key required by default; base URL is configurable.
        const base = (config.baseUrl || DEFAULT_LOCAL_URL).replace(/\/$/, '');
        url = `${base}/chat/completions`;
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        body = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        break;
      }
      case 'other': {
        const base = (config.baseUrl || DEFAULT_OTHER_URL).replace(/\/$/, '');
        url = `${base}/chat/completions`;
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        body = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        break;
      }
      case 'openai': {
        if (!config.apiKey) return { ok: false, error: 'OpenAI API key is missing.' };
        const base = (config.baseUrl || DEFAULT_OPENAI_URL).replace(/\/$/, '');
        url = `${base}/chat/completions`;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        body = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        break;
      }
      case 'deepseek': {
        if (!config.apiKey) return { ok: false, error: 'DeepSeek API key is missing.' };
        const base = (config.baseUrl || DEFAULT_DEEPSEEK_URL).replace(/\/$/, '');
        url = `${base}/chat/completions`;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        body = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        break;
      }
      case 'openrouter': {
        if (!config.apiKey) return { ok: false, error: 'OpenRouter API key is missing.' };
        const base = (config.baseUrl || DEFAULT_OPENROUTER_URL).replace(/\/$/, '');
        url = `${base}/chat/completions`;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        body = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        break;
      }
      default:
        return { ok: false, error: 'Unknown provider.' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: formatProviderError(res.status, detail) };
    }

    const data = await res.json();
    const raw = extractText(config.provider, data);
    return { ok: true, result: parseResult(raw) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

const defaultModel = (provider: ProviderId): string => {
  switch (provider) {
    case 'claude':
      return 'claude-3-5-sonnet-latest';
    case 'gemini':
      return 'gemini-1.5-flash';
    case 'local':
      return 'llama3.1';
    case 'openrouter':
      return 'openai/gpt-4o-mini';
    case 'openai':
      return 'gpt-4o-mini';
    case 'deepseek':
      return 'deepseek-chat';
    case 'other':
      return 'gpt-4o-mini';
  }
};