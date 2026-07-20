/**
 * Simple orchestration of the four fact‑check agents.
 *
 * The UI (FactCheck component) already provides an `onFactCheck` callback that
 * talks to the background service worker and returns a {@link FactCheckResult}.
 * This pipeline demonstrates how the agents could be wired together:
 *
 * 1. **Parser** – de‑noise the raw text.
 * 2. **Logic** – (placeholder) would run logical analysis and external verification.
 * 3. **Bias** – (placeholder) would extract rhetorical cues and fallacies.
 * 4. **Critic** – synthesize the final JSON result.
 *
 * In the current scaffold the Logic and Bias steps are no‑ops, and the
 * background provider call is performed inside the `onFactCheck` callback.
 * The pipeline therefore simply forwards the text through the agents and
 * returns the result from `onFactCheck` when the Critic cannot produce a
 * definitive verdict.
 */

import { FactCheckLanguage, FactCheckResult } from './prompt';
import { parse } from './agents/Parser';
import { runLogic } from './agents/Logic';
import { analyzeBias } from './agents/Bias';
import { synthesize } from './agents';

// Maximum time (ms) a SINGLE provider attempt is allowed before it is aborted.
// Each attempt gets its own 9s window; on timeout the pipeline falls back to
// the next provider and the UI recounts its progress bar.
export const MAX_FACTCHECK_MS = 9000;

/**
 * Run the full fact‑check pipeline.
 *
 * @param text        The raw Zhihu answer/question text.
 * @param language    UI language selected by the user.
 * @param onFactCheck Callback that talks to the background worker and returns
 *                    a {@link FactCheckResult} (or an error object). It streams
 *                    per-attempt stages (and fallback/recount flags) via onStage.
 * @param onStage     Optional callback reporting the current pipeline stage so
 *                    the UI can show a "thinking" progress indicator.
 * @returns           A promise resolving to the final {@link FactCheckResult}.
 */
export const runFactCheckPipeline = async (
  text: string,
  language: FactCheckLanguage,
  onFactCheck: (
    t: string,
    onStage?: (stage: string, isRetry: boolean) => void
  ) => Promise<FactCheckResult | { error: string }>,
  onStage?: (stage: string, isRetry: boolean) => void
): Promise<FactCheckResult> => {
  // 1️⃣ Parser – clean the input.
  onStage?.('Parsing text…');
  const parsed = parse(text, language);

  // 2️⃣ Logic – placeholder (could call external services here).
  onStage?.('Running logic analysis…');
  const logicOutput = await runLogic(parsed, language);

  // 3️⃣ Bias – placeholder analysis.
  onStage?.('Analyzing bias & fallacies…');
  const biasOutput = analyzeBias(logicOutput, language);

  // 4️⃣ Critic – turn the (potentially enriched) response into the final shape.
  onStage?.('Synthesizing verdict…');
  const finalResult = synthesize(biasOutput, language);

  // If the Critic produced a valid result (i.e., it could parse JSON and has a definitive verdict), return it.
  if (finalResult && finalResult.verdict && finalResult.verdict !== 'unverified') {
    return finalResult;
  }

  // Fallback: ask the background provider directly. The onFactCheck callback
  // enforces a per-attempt 9s timeout and streams per-provider stages
  // (including fallbacks) via the same onStage signature, so a slow provider's
  // 9s timeout triggers a recount and an automatic retry on the next model.
  onStage?.('Contacting AI provider…', false);
  const providerResult = await onFactCheck(text, onStage);
  if ('error' in providerResult) {
    // Return a minimal error result that matches FactCheckResult shape.
    return {
      validityVsTruth: providerResult.error,
      rhetoric: { ethos: '', pathos: '', logos: '' },
      fallacies: [],
      verdict: 'unverified',
    };
  }
  return providerResult;
};
