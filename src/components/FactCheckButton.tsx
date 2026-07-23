import React, { useState } from 'react';
import { Box, Button, Chip, Popover, Typography, Divider, LinearProgress, Tooltip } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';

const FACTCHECK_CLASS = 'zhihu-factcheck-inline';
const MAX_FACTCHECK_MS = 9000;

export type FactCheckButtonProps = {
  enabled: boolean;
  text: string;
  onFactCheck: (text: string, onStage?: (stage: string, isRetry?: boolean) => void) => Promise<unknown>;
};

interface Fallacy {
  name: string;
  quote?: string;
  explanation: string;
}

interface Source {
  url: string;
  title?: string;
}

interface FactCheckResult {
  verdict: string;
  validityVsTruth?: string;
  rhetoric?: { ethos?: string; pathos?: string; logos?: string };
  fallacies?: Fallacy[];
  sources?: Source[];
}

export const FactCheckButton: React.FC<FactCheckButtonProps> = ({ enabled, text, onFactCheck }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    setAnchor(target);
    if (result || error) return;
    setLoading(true); setError(null); setProgress(0); setStage('Starting…');
    const tick = Math.max(50, Math.floor(MAX_FACTCHECK_MS / 100));
    const timer = setInterval(() => setProgress((p) => p >= 100 ? 100 : p + 100 * (tick / MAX_FACTCHECK_MS)), tick);
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

  const open = Boolean(anchor);

  return (
    <Box component="span" className={FACTCHECK_CLASS} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 0.75, verticalAlign: 'middle' }}>
      <Tooltip title={enabled ? 'AI fact-check this answer' : 'Configure a provider in Options'}>
        <Box component="span">
          <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={handleClick} disabled={!enabled}>Fact Check</Button>
        </Box>
      </Tooltip>
      <Popover open={open} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { p: 2, maxWidth: 360, maxHeight: 420, overflowY: 'auto' } } }}>
        {loading && <Box sx={{ width: '100%', minWidth: 240 }}><Typography variant="body2" color="text.secondary">{stage || 'Analyzing…'}</Typography><LinearProgress variant="determinate" value={progress} /></Box>}
        {!loading && error && <Typography variant="body2" color="error">{error}</Typography>}
        {!loading && result && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Fact Check</Typography>
              <Chip size="small" label={result.verdict} color={result.verdict === 'credible' ? 'success' : result.verdict === 'misleading' ? 'warning' : 'default'} />
              {provider && <Chip size="small" variant="outlined" label={`via ${provider}`} />}
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {result.validityVsTruth && <Box sx={{ mb: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Formal Logic</Typography><Typography variant="body2" color="text.secondary">{result.validityVsTruth}</Typography></Box>}
            {result.rhetoric && <>
              <Box sx={{ mb: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Ethos (Credibility)</Typography><Typography variant="body2" color="text.secondary">{result.rhetoric.ethos}</Typography></Box>
              <Box sx={{ mb: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Pathos (Emotion)</Typography><Typography variant="body2" color="text.secondary">{result.rhetoric.pathos}</Typography></Box>
              <Box sx={{ mb: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Logos (Logic)</Typography><Typography variant="body2" color="text.secondary">{result.rhetoric.logos}</Typography></Box>
            </>}
            {result.fallacies?.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Informal Fallacies</Typography>
                {result.fallacies.map((f: Fallacy, i: number) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.name}</Typography>
                    {f.quote && <Typography variant="body2" component="blockquote" sx={{ borderLeft: '3px solid', borderColor: 'divider', pl: 1 }}>{f.quote}</Typography>}
                    <Typography variant="body2" color="text.secondary">{f.explanation}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {result.sources?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Sources</Typography>
                {result.sources.map((s: Source, i: number) => (
                  <Typography key={i} variant="body2" component="a" href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
};