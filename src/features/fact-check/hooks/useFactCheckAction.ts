import { useState } from 'react';

export interface FactCheckResult {
  verdict: string;
  validityVsTruth?: string;
  rhetoric?: { ethos?: string; pathos?: string; logos?: string };
  fallacies?: { name: string; quote?: string; explanation: string }[];
  sources?: { url: string; title?: string }[];
}

export const useFactCheckAction = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const handleClick = async (_e: React.MouseEvent<HTMLElement>, enabled: boolean, text: string, onFactCheck: (text: string, onStage?: (stage: string, isRetry?: boolean) => void) => Promise<unknown>) => {
    if (result || error) return;
    if (!enabled) return;
    setLoading(true); setError(null); setProgress(0); setStage('Starting…');
    const tick = Math.max(50, Math.floor(9000 / 100));
    const timer = setInterval(() => setProgress((p) => p >= 100 ? 100 : p + 100 * (tick / 9000)), tick);
    try {
      const res = await onFactCheck(text);
      if (res && typeof res === 'object' && 'error' in res) {
        setError((res as { error: string }).error);
      } else {
        setResult(res as FactCheckResult);
        if (res && typeof res === 'object' && 'provider' in res) {
          setProvider((res as { provider?: string }).provider ?? null);
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { clearInterval(timer); setProgress(100); setLoading(false); }
  };

  return { loading, result, provider, error, progress, stage, setError, setResult, handleClick };
};