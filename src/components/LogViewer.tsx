import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { getLogs, clearLogs, LogEntry } from '../utils/index';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
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

  return (
    <Box>
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
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={clearLog}
            disabled={logs.length === 0}
          >
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
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Chip
                          label={log.level}
                          size="small"
                          color={
                            log.level === 'error'
                              ? 'error'
                              : log.level === 'warn'
                                ? 'warning'
                                : 'default'
                          }
                        />
                        <Typography component="span" variant="body2">
                          {new Date(log.time).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      log.context
                        ? `${log.message} (${log.context})`
                        : log.message
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default LogViewer;