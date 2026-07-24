import React from 'react';
import { createPortal } from 'react-dom';
import { Box, ThemeProvider, createTheme } from '@mui/material';
import { useBlockUser } from '../hooks/useBlockUser';
import { BlockButton } from './BlockUserButton';
import { BlockUser } from './BlockUser';
import { FactCheckButton } from '../../fact-check/components/FactCheckButton';
import { useZhihuContent } from '../../../hooks/useZhihuContent';
import { useFactCheckRunner } from '../../fact-check/hooks/useFactCheckRunner';
import { useFactCheckContainers } from '../../fact-check/hooks/useFactCheckContainers';
import { useFactCheckConfig } from '../../fact-check/hooks/useFactCheckConfig';
import type { ZhihuContent } from '../../../hooks/useZhihuContent';

/**
 * Main wrapper that composes both Block User and Fact Check controls.
 * Delegates logic to hooks; this file only renders UI.
 */
export const ContentControls: React.FC = () => {
  const { blocked, users, blockContainers, blockUser, unblockUser } = useBlockUser();
  const { contents } = useZhihuContent();
  const { factCheckEnabled, language, timeoutSec } = useFactCheckConfig();
  const runFactCheck = useFactCheckRunner(language, timeoutSec);
  const fcContainers = useFactCheckContainers(contents);

  return (
    <ThemeProvider theme={createTheme()}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          ml: 0.75,
          verticalAlign: 'middle',
        }}
      >
        {/* Block buttons for users without answer content */}
        {users.map((user) => {
          const hasContent = contents.some((c) => c.element.contains(user.element));
          if (hasContent) return null;
          const container = blockContainers.get(user.id);
          if (!container) return null;
          const isBlocked = blocked.some((u) => u.id === user.id);
          return createPortal(
            <BlockButton
              isBlocked={isBlocked}
              onBlock={() => blockUser(user.id, user.name)}
              onUnblock={() => unblockUser(user.id)}
            />,
            container
          );
        })}

        {/* Combined controls for each answer content */}
        {contents.map((content) => {
          const container = fcContainers.get(content.id);
          if (!container) return null;
          const user = users.find((u) => content.element.contains(u.element));
          const isBlocked = user ? blocked.some((u) => u.id === user.id) : false;
          return createPortal(
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <BlockButton
                isBlocked={isBlocked}
                onBlock={() => user && blockUser(user.id, user.name)}
                onUnblock={() => user && unblockUser(user.id)}
              />
              <FactCheckButton
                enabled={factCheckEnabled}
                text={content.text}
                onFactCheck={runFactCheck}
              />
            </Box>,
            container
          );
        })}
      </Box>
    </ThemeProvider>
  );
};