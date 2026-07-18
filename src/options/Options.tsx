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
} from '@mui/material';
import { getLogs, clearLogs, LogEntry } from '../logger';

type BlockedUser = { id: string; name: string };

const Options: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        if (result.zhihuBlockedUsers) setBlocked(result.zhihuBlockedUsers as BlockedUser[]);
      });
      getLogs().then(setLogs);
    }
  }, []);

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