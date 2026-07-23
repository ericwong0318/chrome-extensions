import React from 'react';
import { Box, ThemeProvider, createTheme } from '@mui/material';

/**
 * Shared base wrapper for content-script inline controls.
 */
export const ControlsContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <ThemeProvider theme={createTheme()}>
    <Box
      component="span"
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ml: 0.75,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </Box>
  </ThemeProvider>
);