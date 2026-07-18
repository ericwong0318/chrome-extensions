import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, ThemeProvider, createTheme } from '@mui/material';
import { logError } from '../logger';

type BlockedUser = { id: string; name: string };
type ZhihuUser = { name: string; id: string; element: HTMLElement };

const INLINE_CLASS = 'zhihu-block-inline';

const getZhihuUsers = () => {
  try {
    // Try to find user cards or author links on Zhihu answers/comments
    const userNodes = Array.from(document.querySelectorAll('[data-za-detail-view-path^="User"] a.UserLink-link, .AuthorInfo-head a.UserLink-link'));
    const users: ZhihuUser[] = [];
    userNodes.forEach((el) => {
      const name = el.textContent?.trim() || '未知用户';
      const id = el.getAttribute('href') || name;
      users.push({ name, id, element: el as HTMLElement });
    });
    // Remove duplicates by id
    return Array.from(new Map(users.map(u => [u.id, u])).values());
  } catch (err) {
    logError('Failed to collect Zhihu users', String(err));
    return [];
  }
};

// Walk up from a user link to the content container and toggle visibility
const setUserContentHidden = (user: ZhihuUser, hidden: boolean) => {
  let node: HTMLElement | null = user.element;
  while (node && node !== document.body) {
    if (node.classList.contains('List-item') || node.classList.contains('ContentItem') || node.classList.contains('CommentItem')) {
      node.style.display = hidden ? 'none' : '';
      break;
    }
    node = node.parentElement;
  }
};

// Inline controls rendered next to each user's name using MUI defaults.
const InlineControls: React.FC<{
  user: ZhihuUser;
  isBlocked: boolean;
  isUnlocked: boolean;
  onBlock: () => void;
  onUnlock: () => void;
  onLock: () => void;
  onUnblock: () => void;
}> = ({ user, isBlocked, isUnlocked, onBlock, onUnlock, onLock, onUnblock }) => (
  <Box
    className={INLINE_CLASS}
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 0.75, verticalAlign: 'middle' }}
  >
    {!isBlocked ? (
      <Button variant="contained" color="error" size="small" onClick={onBlock}>
        Block
      </Button>
    ) : isUnlocked ? (
      <Button variant="outlined" color="primary" size="small" onClick={onLock}>
        Lock
      </Button>
    ) : (
      <>
        <Button variant="outlined" color="success" size="small" onClick={onUnlock}>
          Unlock
        </Button>
        <Button variant="text" color="secondary" size="small" onClick={onUnblock}>
          Unblock
        </Button>
      </>
    )}
  </Box>
);

const Overlay: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  // Users that are temporarily unlocked (content visible but still blocked)
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // Load blocked users from chrome.storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        if (result.zhihuBlockedUsers) setBlocked(result.zhihuBlockedUsers as BlockedUser[]);
      });
    }
  }, []);
  const [users, setUsers] = useState<ZhihuUser[]>([]);
  const scanTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Merge any newly discovered users into the existing list, keeping the
    // first-seen element reference but refreshing it if Zhihu re-rendered it.
    const scan = () => {
      setUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        getZhihuUsers().forEach((u) => map.set(u.id, u));
        return Array.from(map.values());
      });
    };

    scan(); // initial collection

    // Zhihu lazy-loads answers as the user scrolls, so user links for
    // not-yet-visible answers are absent from the DOM on mount. Observe the
    // document for added nodes and re-scan (debounced) so those late answers
    // also receive their block controls.
    const observer = new MutationObserver(() => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(scan, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, []);

  const blockUser = (id: string, name: string) => {
    if (blocked.some(u => u.id === id)) return;
    const updated = [...blocked, { id, name }];
    setBlocked(updated);
    // Hide all content by this user
    users.filter(u => u.id === id).forEach(u => setUserContentHidden(u, true));
    // Persist to chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: updated });
    }
  };

  // Unlock: temporarily reveal the user's content without removing the block
  const unlockUser = (id: string) => {
    setUnlocked([...unlocked, id]);
    const user = users.find(u => u.id === id);
    if (user) setUserContentHidden(user, false);
  };

  // Lock: re-hide the temporarily unlocked user's content
  const lockUser = (id: string) => {
    setUnlocked(unlocked.filter(u => u !== id));
    const user = users.find(u => u.id === id);
    if (user) setUserContentHidden(user, true);
  };

  // Unblock: permanently remove the user from the block list
  const unblockUser = (id: string) => {
    const updated = blocked.filter(u => u.id !== id);
    setBlocked(updated);
    setUnlocked(unlocked.filter(u => u !== id));
    const user = users.find(u => u.id === id);
    if (user) setUserContentHidden(user, false);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: updated });
    }
  };

  // Hide content for already-blocked users on mount (unless unlocked)
  useEffect(() => {
    blocked.forEach(b => {
      if (unlocked.includes(b.id)) return;
      users.filter(u => u.id === b.id).forEach(u => setUserContentHidden(u, true));
    });
  }, [blocked, users, unlocked]);

  // Insert (once) an inline container right after each user's name on the page.
  // The MUI controls are rendered into these containers via portals below.
  const [containers, setContainers] = useState<Map<string, HTMLElement>>(new Map());
  useEffect(() => {
    const next = new Map<string, HTMLElement>();
    users.forEach((user) => {
      const parent = user.element.parentElement;
      if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(user.id) : user.id;
      const existing = parent.querySelector<HTMLElement>(`.${INLINE_CLASS}[data-userid="${escapedId}"]`);
      if (existing) {
        next.set(user.id, existing);
      } else {
        const span = document.createElement('span');
        span.className = INLINE_CLASS;
        span.setAttribute('data-userid', user.id);
        user.element.insertAdjacentElement('afterend', span);
        next.set(user.id, span);
      }
    });
    setContainers(next);
  }, [users]);

  return (
    <ThemeProvider theme={createTheme()}>
      <>
        {users.map((user) => {
          const container = containers.get(user.id);
          if (!container) return null;
          const isBlocked = blocked.some(u => u.id === user.id);
          const isUnlocked = unlocked.includes(user.id);
          return createPortal(
            <InlineControls
              user={user}
              isBlocked={isBlocked}
              isUnlocked={isUnlocked}
              onBlock={() => blockUser(user.id, user.name)}
              onUnlock={() => unlockUser(user.id)}
              onLock={() => lockUser(user.id)}
              onUnblock={() => unblockUser(user.id)}
            />,
            container
          );
        })}
      </>
    </ThemeProvider>
  );
};

export default Overlay;