import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Popover,
  Typography,
  Divider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { FactCheckResult, Verdict } from './prompt';

const VERDICT_COLOR: Record<Verdict, 'success' | 'warning' | 'default'> = {
  credible: 'success',
  misleading: 'warning',
  unverified: 'default',
};

const VERDICT_LABEL: Record<Verdict, string> = {
  credible: 'Credible',
  misleading: 'Misleading',
  unverified: 'Unverified',
};

type Props = {
  text: string;
  // Whether a provider is configured in Options. When false, the button is
  // disabled and explains where to set one up.
  enabled: boolean;
  onFactCheck: (text: string) => Promise<FactCheckResult | { error: string }>;
};

const Section: React.FC<{ title: string; body: string }> = ({ title, body }) =>
  body ? (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Box>
  ) : null;

const FactCheck: React.FC<Props> = ({ text, enabled, onFactCheck }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = Boolean(anchor);

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    if (result || error) return; // already fetched, just show popover
    setLoading(true);
    setError(null);
    try {
      const res = await onFactCheck(text);
      if ('error' in res) setError(res.error);
      else setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setAnchor(null);

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.75 }}>
      <Tooltip title={enabled ? 'AI fact-check this answer' : 'Configure a provider in Options'}>
        <span>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FactCheckIcon />}
            onClick={handleClick}
            disabled={!enabled}
          >
            Fact Check
          </Button>
        </span>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, maxWidth: 360, maxHeight: 420, overflowY: 'auto' } } }}
      >
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Analyzing…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        {!loading && result && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Fact Check
              </Typography>
              <Chip
                size="small"
                label={VERDICT_LABEL[result.verdict]}
                color={VERDICT_COLOR[result.verdict]}
              />
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            <Section title="Formal Logic — Validity vs. Truth" body={result.validityVsTruth} />
            <Section title="Ethos (Credibility)" body={result.rhetoric.ethos} />
            <Section title="Pathos (Emotion)" body={result.rhetoric.pathos} />
            <Section title="Logos (Logic / Reason)" body={result.rhetoric.logos} />

            {result.fallacies.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Informal Fallacies
                </Typography>
                {result.fallacies.map((f, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {f.name}
                    </Typography>
                    {f.quote && (
                      <Typography
                        variant="body2"
                        component="blockquote"
                        sx={{ borderLeft: '3px solid', borderColor: 'divider', pl: 1, my: 0.5 }}
                      >
                        “{f.quote}”
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {f.explanation}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {result.sources && result.sources.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Sources
                </Typography>
                {result.sources.map((s, i) => (
                  <Typography key={i} variant="body2" component="a" href={s.url} target="_blank" rel="noreferrer">
                    {s.title || s.url}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default FactCheck;