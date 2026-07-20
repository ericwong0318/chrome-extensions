import { FactCheckLanguage, parseResult, FactCheckResult } from '../prompt';

export const synthesize = (enrichedResponse: string, _language: FactCheckLanguage = 'en'): FactCheckResult => {
  return parseResult(enrichedResponse);
};
