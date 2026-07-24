import React from 'react';
import { Box } from '@mui/material';
import { useBlockUser, INLINE_CLASS } from '../blocker/useBlockUser';
import { BlockButton } from './BlockUserButton';

/**
 * Main blocker component that manages the blocking UI for all users on the page
 */
export const Blocker: React.FC = () => {
  const { blocked, users, blockUser, unblockUser } = useBlockUser();

  return (
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
      {users.map((user) => {
        const isBlocked = blocked.some((u) => u.id === user.id);
        const parent = user.element.parentElement;
        if (!parent) return null;
        
        const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(user.id) : user.id;
        const existing = parent.querySelector<HTMLElement>(`.${INLINE_CLASS}[data-userid="${escapedId}"]`);
        if (!existing) return null;

        return (
          <BlockButton
            key={user.id}
            isBlocked={isBlocked}
            onBlock={() => blockUser(user.id, user.name)}
            onUnblock={() => unblockUser(user.id)}
          />
        );
      })}
    </Box>
  );
};
