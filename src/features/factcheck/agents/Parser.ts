/**
 * Agent 1 – De‑Noiser & Claim Extractor
 *
 * This module provides a very lightweight implementation that prepares the
 * raw Zhihu answer text for downstream processing. In a full implementation
 * you would strip introductions, extract factual vs. opinion statements,
 * and collect any embedded resources (links, tables, image captions).
 *
 * For now the function `parse` simply returns the trimmed input and an empty
 * list of extracted resources – enough to keep the pipeline functional while
 * allowing you to replace the internals later.
 */

import { FactCheckLanguage } from '../prompt';

export type ParsedInput = {
  /** Cleaned text ready for the next stage */
  cleanedText: string;
  /** Extracted URLs, tables, image captions, etc. (placeholder) */
  resources: string[];
};

/**
 * De‑noise the raw answer and extract resources.
 *
 * @param raw   The original answer/question text from Zhihu.
 * @param _lang The language selected UI language (currently unused).
 * @returns     An object containing the cleaned text and any extracted resources.
 */
export const parse = (
  raw: string,
  _lang: FactCheckLanguage = 'en',
): ParsedInput => {
  // Very simple cleaning: trim whitespace and collapse multiple line breaks.
  const cleaned = raw.trim().replace(/\n{2,}/g, '\n');

  // Placeholder – in a real implementation you would parse links, tables, etc.
  const resources: string[] = [];

  return { cleanedText: cleaned, resources };
};