// Shared analysis framework sent to every AI provider so results are
// consistent regardless of which provider the user selects. The model is asked
// to decompose a Zhihu answer/question into three lenses:
//   1. Formal Logic — Validity vs. Truth
//   2. Rhetoric — Aristotle's Ethos / Pathos / Logos
//   3. Informal Fallacies
// and to return a single JSON object matching FactCheckResult.

export type Verdict = 'credible' | 'misleading' | 'unverified';

// Language the AI fact-check reply should be written in.
export type FactCheckLanguage = 'zh-CN' | 'zh-TW' | 'en';

export const LANGUAGE_LABELS: Record<FactCheckLanguage, string> = {
  'zh-CN': '中文（简体）',
  'zh-TW': '中文（繁體）',
  en: 'English',
};

// Human-readable instruction appended to the user prompt so the model writes
// its prose in the chosen language while keeping the `verdict` enum English.
const LANGUAGE_INSTRUCTION: Record<FactCheckLanguage, string> = {
  'zh-CN':
    '请用中文（简体）撰写所有说明性文字（validityVsTruth、rhetoric 各字段、fallacies 的 explanation 以及 sources 的 title）。但 verdict 字段必须严格保持英文枚举值之一："credible"、"misleading" 或 "unverified"，不要翻译。',
  'zh-TW':
    '請用中文（繁體）撰寫所有說明性文字（validityVsTruth、rhetoric 各欄位、fallacies 的 explanation 以及 sources 的 title）。但 verdict 欄位必須嚴格保持英文列舉值之一："credible"、"misleading" 或 "unverified"，不要翻譯。',
  en: 'Write all explanatory prose (validityVsTruth, the rhetoric fields, each fallacy explanation, and source titles) in English. Keep the "verdict" field exactly as one of the English enum values: "credible", "misleading", or "unverified" — do not translate it.',
};

export type FactCheckResult = {
  validityVsTruth: string;
  rhetoric: {
    ethos: string;
    pathos: string;
    logos: string;
  };
  fallacies: {
    name: string;
    quote: string;
    explanation: string;
  }[];
  verdict: Verdict;
  sources?: { title: string; url: string }[];
};

/**
 * FactCheckResult augmented with the name of the provider that actually
 * answered (may be a fallback when the primary provider timed out).
 */
export type FactCheckResultWithProvider = FactCheckResult & {
  provider?: string | null;
};

export const SYSTEM_PROMPT = `You are a rigorous critical-thinking assistant that fact-checks and analyzes an argument written in an answer or question. You never invent facts. When you cannot verify a claim, say so explicitly.

Analyze the user's text through THREE lenses and respond with ONLY a JSON object (no markdown, no code fences) matching exactly this shape:

{
  "validityVsTruth": string,            // Distinguish structural validity (do the premises logically support the conclusion?) from truth (are the premises/facts actually true or verifiable?).
  "rhetoric": {
    "ethos": string,                    // Does it lean on the author's credibility, authority, character, or expertise?
    "pathos": string,                   // Does it stir emotion (fear, anger, hope, empathy) to motivate the audience?
    "logos": string                     // Use of facts, statistics, examples, or structured reasoning (e.g. Toulmin method, arguments by example).
  },
  "fallacies": [                         // List any informal fallacies actually present.
    {
      "name": string,                   // e.g. "Ad hominem", "Straw man", "False dilemma", "Appeal to emotion", "Slippery slope", "Hasty generalization"
      "quote": string,                  // The exact span from the text that exhibits the fallacy.
      "explanation": string             // Why this is a fallacy.
    }
  ],
  "verdict": "credible" | "misleading" | "unverified",
  "sources": [                          // Optional. Only include if you are confident of a real reference.
    { "title": string, "url": string }
  ]
}`;

export const buildUserPrompt = (
  text: string,
  question?: string,
  language: FactCheckLanguage = 'en',
): string => {
  const instruction = LANGUAGE_INSTRUCTION[language] || LANGUAGE_INSTRUCTION.en;
  const questionSection = question ? `The original Zhihu question was:\n\n"""\n${question.trim()}\n"""\n\n` : '';
  return `Analyze the following answer from a Zhihu post:\n\n${questionSection}"""\n${text.trim()}\n"""\n\n${instruction}`;
};

// Extract the first JSON object from a model response, tolerating code fences
// or surrounding prose. Returns null if no JSON can be found.
const extractJson = (raw: string): Record<string, unknown> | null => {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    // Fall back to the first balanced {...} span.
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      } catch {
        return null;
      }
    }
    return null;
  }
};

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const asFallacies = (v: unknown): FactCheckResult['fallacies'] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      name: asString(item.name),
      quote: asString(item.quote),
      explanation: asString(item.explanation),
    }));
};

const asSources = (v: unknown): FactCheckResult['sources'] => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({ title: asString(item.title), url: asString(item.url) }))
    .filter((s) => s.url);
  return out.length ? out : undefined;
};

const asVerdict = (v: unknown): Verdict => {
  if (v === 'credible' || v === 'misleading' || v === 'unverified') return v;
  return 'unverified';
};

// Coerce a provider's raw text output into a FactCheckResult. Always returns a
// valid (if partial) result so the UI can render something even on malformed
// model output.
export const parseResult = (raw: string): FactCheckResult => {
  const json = extractJson(raw);
  if (!json) {
    return {
      validityVsTruth: raw.trim() || 'No analysis returned.',
      rhetoric: { ethos: '', pathos: '', logos: '' },
      fallacies: [],
      verdict: 'unverified',
    };
  }
  const rhetoric = (json.rhetoric ?? {}) as Record<string, unknown>;
  return {
    validityVsTruth: asString(json.validityVsTruth),
    rhetoric: {
      ethos: asString(rhetoric.ethos),
      pathos: asString(rhetoric.pathos),
      logos: asString(rhetoric.logos),
    },
    fallacies: asFallacies(json.fallacies),
    verdict: asVerdict(json.verdict),
    sources: asSources(json.sources),
  };
};