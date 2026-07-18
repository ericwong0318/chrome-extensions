import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  ThemeProvider,
  createTheme,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import { getLogs, clearLogs, LogEntry } from '../logger';
import { FactCheckLanguage, LANGUAGE_LABELS } from '../factcheck/prompt';

type BlockedUser = { id: string; name: string };

type FactCheckConfig = {
  provider: 'claude' | 'local' | 'gemini' | 'openai' | 'deepseek' | 'openrouter' | 'other' | '';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  language?: FactCheckLanguage;
};

const Options: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fcConfig, setFcConfig] = useState<FactCheckConfig>({ provider: '' });
  const [fcSaved, setFcSaved] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        if (result.zhihuBlockedUsers) setBlocked(result.zhihuBlockedUsers as BlockedUser[]);
      });
      chrome.storage.sync.get({ factCheckConfig: null }, (result) => {
        if (result.factCheckConfig) setFcConfig(result.factCheckConfig as FactCheckConfig);
      });
      getLogs().then(setLogs);
    }
  }, []);

  const saveFcConfig = () => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    const toSave: FactCheckConfig = {
      provider: fcConfig.provider,
      apiKey: fcConfig.apiKey,
      model: fcConfig.model,
      baseUrl: fcConfig.baseUrl,
      language: fcConfig.language,
    };
    chrome.storage.sync.set({ factCheckConfig: toSave }, () => setFcSaved(true));
  };

  const refreshLogs = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      getLogs().then(setLogs);
    }
  };

  const clearLog = () => {
    clearLogs().then(() => setLogs([]));
  };

  const unblockUser = (id: string) => {
    const updated = blocked.filter(u => u.id !== id);
    setBlocked(updated);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: updated });
    }
  };

  const clearAll = () => {
    setBlocked([]);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: [] });
    }
  };

  return (
    <ThemeProvider theme={createTheme()}>
      <Paper sx={{ p: 2 }} elevation={0}>
        <Typography variant="h5" gutterBottom>
          Blocked Users
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Manage the list of Zhihu users you have blocked.
        </Typography>

        {blocked.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No users blocked.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="error" size="small" onClick={clearAll} sx={{ mb: 2 }}>
              Clear all
            </Button>
            <List disablePadding>
              {blocked.map((user, idx) => (
                <React.Fragment key={user.id}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem
                    secondaryAction={
                      <Button variant="text" color="secondary" size="small" onClick={() => unblockUser(user.id)}>
                        Unblock
                      </Button>
                    }
                  >
                    <ListItemText primary={user.name} secondary={user.id} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Fact Check (AI)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Send an answer or question to an AI provider for a structured analysis
          (Validity vs. Truth, Ethos/Pathos/Logos, and informal fallacies). The API
          key stays in chrome.storage and is only used by the background service worker.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Stack spacing={2} maxWidth={420}>
            <TextField
              select
              label="Provider"
              value={fcConfig.provider}
              onChange={(e) => {
                setFcSaved(false);
                setFcConfig({ ...fcConfig, provider: e.target.value as FactCheckConfig['provider'] });
              }}
            >
              <MenuItem value="">Disabled</MenuItem>
              <MenuItem value="claude">Claude (Anthropic)</MenuItem>
              <MenuItem value="local">Local (Ollama / Qwen / llama.cpp, free)</MenuItem>
              <MenuItem value="gemini">Gemini (Google)</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="deepseek">DeepSeek</MenuItem>
              <MenuItem value="openrouter">OpenRouter</MenuItem>
              <MenuItem value="other">Other (OpenAI-compatible)</MenuItem>
            </TextField>

            {fcConfig.provider === 'local' && (
              <TextField
                label="Base URL"
                placeholder="http://localhost:11434/v1"
                value={fcConfig.baseUrl || ''}
                onChange={(e) => {
                  setFcSaved(false);
                  setFcConfig({ ...fcConfig, baseUrl: e.target.value });
                }}
              />
            )}

            {(fcConfig.provider === 'claude' ||
              fcConfig.provider === 'gemini' ||
              fcConfig.provider === 'openai' ||
              fcConfig.provider === 'deepseek' ||
              fcConfig.provider === 'openrouter' ||
              fcConfig.provider === 'other') && (
              <TextField
                label="API Key"
                type="password"
                value={fcConfig.apiKey || ''}
                onChange={(e) => {
                  setFcSaved(false);
                  setFcConfig({ ...fcConfig, apiKey: e.target.value });
                }}
              />
            )}

            {fcConfig.provider === 'other' && (
              <TextField
                label="Base URL"
                placeholder="https://api.openai.com/v1"
                value={fcConfig.baseUrl || ''}
                onChange={(e) => {
                  setFcSaved(false);
                  setFcConfig({ ...fcConfig, baseUrl: e.target.value });
                }}
              />
            )}

            <TextField
              label="Model"
              placeholder={
                fcConfig.provider === 'gemini'
                  ? 'gemini-1.5-flash'
              : fcConfig.provider === 'claude'
              ? 'claude-3-5-sonnet-latest'
              : fcConfig.provider === 'openrouter'
              ? 'openai/gpt-4o-mini'
              : fcConfig.provider === 'openai'
              ? 'gpt-4o-mini'
              : fcConfig.provider === 'deepseek'
              ? 'deepseek-chat'
              : fcConfig.provider === 'local'
              ? 'llama3.1'
              : 'gpt-4o-mini'
              }
              value={fcConfig.model || ''}
              onChange={(e) => {
                setFcSaved(false);
                setFcConfig({ ...fcConfig, model: e.target.value });
              }}
            />

            <TextField
              select
              label="Reply language"
              value={fcConfig.language || 'en'}
              onChange={(e) => {
                setFcSaved(false);
                setFcConfig({ ...fcConfig, language: e.target.value as FactCheckLanguage });
              }}
            >
              {(Object.keys(LANGUAGE_LABELS) as FactCheckLanguage[]).map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Button variant="contained" size="small" onClick={saveFcConfig}>
                Save
              </Button>
              {fcSaved && (
                <Typography variant="body2" color="success.main" sx={{ ml: 1, display: 'inline' }}>
                  Saved.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Error Log
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Recent errors captured locally by the extension.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="outlined" size="small" onClick={refreshLogs}>
              Refresh
            </Button>
            <Button variant="outlined" color="error" size="small" onClick={clearLog} disabled={logs.length === 0}>
              Clear log
            </Button>
          </Box>

          {logs.length === 0 ? (
            <Typography variant="body1">No errors logged.</Typography>
          ) : (
            <List disablePadding>
              {[...logs].reverse().map((log, idx) => (
                <React.Fragment key={`${log.time}-${idx}`}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={log.level}
                            size="small"
                            color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'}
                          />
                          <Typography component="span" variant="body2">
                            {new Date(log.time).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={log.context ? `${log.message} (${log.context})` : log.message}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </ThemeProvider>
  );
};

export default Options;