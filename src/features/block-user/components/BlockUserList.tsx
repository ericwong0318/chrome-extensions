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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

type BlockedUser = { id: string; name: string };

interface BlockUserListProps {
  blocked: BlockedUser[];
  onUnblock: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Block User List component for the Options page.
 * Displays a list of blocked users with option to unblock.
 */
export const BlockUserList: React.FC<BlockUserListProps> = ({
  blocked,
  onUnblock,
  onClearAll,
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(blocked);

  useEffect(() => {
    setBlockedUsers(blocked);
  }, [blocked]);

  const handleUnblock = (id: string) => {
    const updated = blockedUsers.filter((u) => u.id !== id);
    setBlockedUsers(updated);
    onUnblock(id);
  };

  const handleClearAll = () => {
    setBlockedUsers([]);
    onClearAll();
  };

  return (
    <Paper sx={{ p: 2 }} elevation={0}>
      <Typography variant="h5" gutterBottom>
        Block User List
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Manage the list of Zhihu users you have blocked.
      </Typography>

      {blockedUsers.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          No users blocked.
        </Typography>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleClearAll}
            sx={{ mb: 2 }}
            startIcon={<DeleteIcon fontSize="small" />}
          >
            Clear all
          </Button>
          <List disablePadding>
            {blockedUsers.map((user, idx) => (
              <React.Fragment key={user.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem
                  secondaryAction={
                    <Button
                      variant="text"
                      color="secondary"
                      size="small"
                      onClick={() => handleUnblock(user.id)}
                    >
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
  );
};