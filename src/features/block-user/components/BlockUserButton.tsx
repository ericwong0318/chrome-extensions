import React from 'react';
import { Box, Button } from '@mui/material';

/**
 * Block/Unblock button component.
 * Rendered both standalone (for users without content) and inside combined controls.
 */
export const BlockButton: React.FC<{
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}> = ({ isBlocked, onBlock, onUnblock }) => (
  <Box
    component="span"
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 0.75, verticalAlign: 'middle' }}
  >
    {!isBlocked ? (
      <Button variant="contained" color="error" size="small" onClick={onBlock}>
        Block
      </Button>
    ) : (
      <Button variant="text" color="secondary" size="small" onClick={onUnblock}>
        Unblock
      </Button>
    )}
  </Box>
);