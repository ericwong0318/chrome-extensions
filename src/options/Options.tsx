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
  ThemeProvider,
  createTheme,
} from '@mui/material';

type BlockedUser = { id: string; name: string };

const Options: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        if (result.zhihuBlockedUsers) setBlocked(result.zhihuBlockedUsers as BlockedUser[]);
      });
    }
  }, []);

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
      </Paper>
    </ThemeProvider>
  );
};

export default Options;