import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, ThemeProvider, createTheme } from '@mui/material';
import { logError } from '../logger';
import FactCheck from '../factcheck/FactCheck';
import { FactCheckResult } from '../factcheck/prompt';
import { normalizeFactCheckConfigs } from '../factcheck/storage';

type BlockedUser = { id: string; name: string };
type ZhihuUser = { name: string; id: string; element: HTMLElement };

// A detected answer/question content block on the page.
type ZhihuContent = { id: string; text: string; element: HTMLElement };

// Selectors that wrap an answer or question body on Zhihu.
const CONTENT_SELECTORS = [
  '.RichText',
  '.ContentItem-title',
  '.AnswerCard',
  '.QuestionAnswer-content',
];

// Collect answer/question content blocks currently in the DOM. We key by the
// outermost stable answer wrapper so re-renders don't duplicate controls. A
// collapsed answer often matches several CONTENT_SELECTORS (.ContentItem-title,
// .RichText, .AnswerCard) that all belong to the SAME answer, so we group every
// matched node under its shared outermost wrapper (.List-item/.ContentItem,
// falling back to .AnswerCard/.QuestionAnswer-content) and keep a single entry
// per answer (preferring the element with the most text / a real data-id).
const getZhihuContent = (): ZhihuContent[] => {
  try {
    const nodes = Array.from(
      document.querySelectorAll(CONTENT_SELECTORS.join(',')),
    );
    const byAnchor = new Map<HTMLElement, ZhihuContent>();
    nodes.forEach((el) => {
      const node = el as HTMLElement;
      const text = (node.innerText || node.textContent || '').trim();
      if (!text || text.length < 20) return;
      // Group by the outermost stable wrapper so different parts of one answer
      // collapse into a single entry.
      const anchor =
        (node.closest('.List-item, .ContentItem') as HTMLElement) ||
        (node.closest('.AnswerCard, .QuestionAnswer-content') as HTMLElement) ||
        node;
      const existing = byAnchor.get(anchor);
      if (!existing) {
        const id = anchor.getAttribute('data-id') || text.slice(0, 40);
        byAnchor.set(anchor, { id, text, element: anchor });
      } else {
        // Merge: keep the longer text and prefer an element that has a data-id.
        if (text.length > existing.text.length) existing.text = text;
        if (
          !existing.element.getAttribute('data-id') &&
          node.getAttribute('data-id')
        ) {
          existing.element = node;
          existing.id = node.getAttribute('data-id') || existing.id;
        }
      }
    });
    return Array.from(byAnchor.values());
  } catch (err) {
    logError('Failed to collect Zhihu content', String(err));
    return [];
  }
};

const INLINE_CLASS = 'zhihu-block-inline';

const getZhihuUsers = () => {
  try {
    // Try to find user cards or author links on Zhihu answers/comments
    const userNodes = Array.from(
      document.querySelectorAll(
        '[data-za-detail-view-path^="User"] a.UserLink-link, .AuthorInfo-head a.UserLink-link',
      ),
    );
    const users: ZhihuUser[] = [];
    userNodes.forEach((el) => {
      const name = el.textContent?.trim() || '未知用户';
      const id = el.getAttribute('href') || name;
      users.push({ name, id, element: el as HTMLElement });
    });
    // Remove duplicates by id
    return Array.from(new Map(users.map((u) => [u.id, u])).values());
  } catch (err) {
    logError('Failed to collect Zhihu users', String(err));
    return [];
  }
};

// Walk up from a user link to the content container and toggle visibility
const setUserContentHidden = (user: ZhihuUser, hidden: boolean) => {
  let node: HTMLElement | null = user.element;
  while (node && node !== document.body) {
    if (
      node.classList.contains('List-item') ||
      node.classList.contains('ContentItem') ||
      node.classList.contains('CommentItem')
    ) {
      node.style.display = hidden ? 'none' : '';
      break;
    }
    node = node.parentElement;
  }
};

// Inline controls rendered next to each user's name using MUI defaults.
const InlineControls: React.FC<{
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}> = ({ isBlocked, onBlock, onUnblock }) => (
  <Box
    className={INLINE_CLASS}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      ml: 0.75,
      verticalAlign: 'middle',
    }}
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

// Messages received over the 'factCheck' port from the background worker.
type FactCheckPortResponse =
  | { stage: string; isRetry?: boolean }
  | { disabled: true }
  | { error: string }
  | { result: FactCheckResult; provider?: string };

const Blocker: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  // Load blocked users from chrome.storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ zhihuBlockedUsers: [] }, (result) => {
        if (result.zhihuBlockedUsers)
          setBlocked(result.zhihuBlockedUsers as BlockedUser[]);
      });
    }
  }, []);
  const [users, setUsers] = useState<ZhihuUser[]>([]);
  const [contents, setContents] = useState<ZhihuContent[]>([]);
  const [factCheckEnabled, setFactCheckEnabled] = useState(false);
  const scanTimer = useRef<number | undefined>(undefined);

  // Load fact-check provider config to enable/disable the button. Supports both
  // the new ordered list (factCheckConfigs) and the legacy single config.
  useEffect(() => {
    if (
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.sync
    )
      return;

    const loadFactCheckEnabled = () => {
      chrome.storage.sync.get(
        { factCheckConfigs: null, factCheckConfig: null },
        (result) => {
          setFactCheckEnabled(
            normalizeFactCheckConfigs(
              result.factCheckConfigs,
              result.factCheckConfig,
            ).length > 0,
          );
        },
      );
    };

    loadFactCheckEnabled();

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'sync') return;
      if (changes.factCheckConfigs || changes.factCheckConfig) {
        loadFactCheckEnabled();
      }
    };

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Ask the background service worker to run the AI fact-check. The key never
  // reaches the content script. The optional onStage callback receives live
  // provider/model updates (and a recount flag when falling back). Each
  // provider attempt is capped at 9s inside the background worker, which
  // automatically retries the next configured model and falls back through the
  // whole list; only if every provider fails do we surface an error.
  //
  // We use a long-lived port (chrome.runtime.connect) rather than a one-shot
  // sendMessage, because the background streams MULTIPLE messages (a stage
  // update per provider attempt, plus the final result/error) and a single
  // sendResponse can only be delivered once.
  const runFactCheck = (
    text: string,
    onStage?: (stage: string, isRetry: boolean) => void,
  ): Promise<FactCheckResult | { error: string }> => {
    return new Promise<FactCheckResult | { error: string }>((resolve) => {
      if (
        typeof chrome === 'undefined' ||
        !chrome.runtime ||
        !chrome.runtime.connect
      ) {
        resolve({ error: 'Extension runtime unavailable.' });
        return;
      }
      const port = chrome.runtime.connect({ name: 'factCheck' });
      let settled = false;
      const finish = (value: FactCheckResult | { error: string }) => {
        if (settled) return;
        settled = true;
        try {
          port.disconnect();
        } catch {
          /* already closed */
        }
        resolve(value);
      };
      port.onMessage.addListener((response: FactCheckPortResponse) => {
        if (!response) {
          finish({ error: 'No response from background.' });
          return;
        }
        // Streamed stage update from the background (provider/model + fallback).
        if ('stage' in response) {
          onStage?.(response.stage, !!response.isRetry);
          return; // not the final response; keep waiting.
        }
        if ('disabled' in response) {
          finish({ error: 'No fact-check provider configured in Options.' });
          return;
        }
        if ('error' in response) {
          // Background reports a definitive error only after all providers
          // (and their per-attempt 9s windows) have been exhausted.
          finish({ error: response.error });
          return;
        }
        finish(response.result);
      });
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          finish({
            error:
              chrome.runtime.lastError.message || 'Fact-check connection lost.',
          });
        } else if (!settled) {
          finish({ error: 'Fact-check connection closed before completion.' });
        }
      });
      // Kick off the request by sending the text on the port.
      port.postMessage({ text });
    });
  };

  useEffect(() => {
    // Merge any newly discovered users into the existing list, keeping the
    // first-seen element reference but refreshing it if Zhihu re-rendered it.
    const scan = () => {
      setUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        getZhihuUsers().forEach((u) => map.set(u.id, u));
        return Array.from(map.values());
      });
      setContents((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        getZhihuContent().forEach((c) => map.set(c.id, c));
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
    if (blocked.some((u) => u.id === id)) return;
    const updated = [...blocked, { id, name }];
    setBlocked(updated);
    // Hide all content by this user
    users
      .filter((u) => u.id === id)
      .forEach((u) => setUserContentHidden(u, true));
    // Persist to chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: updated });
    }
  };

  // Unblock: permanently remove the user from the block list
  const unblockUser = (id: string) => {
    const updated = blocked.filter((u) => u.id !== id);
    setBlocked(updated);
    const user = users.find((u) => u.id === id);
    if (user) setUserContentHidden(user, false);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ zhihuBlockedUsers: updated });
    }
  };

  // Hide content for already-blocked users on mount
  useEffect(() => {
    blocked.forEach((b) => {
      users
        .filter((u) => u.id === b.id)
        .forEach((u) => setUserContentHidden(u, true));
    });
  }, [blocked, users]);

  // Insert (once) an inline container right after each user's name on the page.
  // The MUI controls are rendered into these containers via portals below.
  const [containers, setContainers] = useState<Map<string, HTMLElement>>(
    new Map(),
  );
  useEffect(() => {
    const next = new Map<string, HTMLElement>();
    users.forEach((user) => {
      const parent = user.element.parentElement;
      if (!parent) return;
      const escapedId =
        typeof CSS !== 'undefined' && CSS.escape
          ? CSS.escape(user.id)
          : user.id;
      const existing = parent.querySelector<HTMLElement>(
        `.${INLINE_CLASS}[data-userid="${escapedId}"]`,
      );
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

  // Insert (once) an inline container at the top of each answer/question body
  // for the Fact Check control.
  const FACTCHECK_CLASS = 'zhihu-factcheck-inline';
  const [fcContainers, setFcContainers] = useState<Map<string, HTMLElement>>(
    new Map(),
  );
  useEffect(() => {
    const next = new Map<string, HTMLElement>();
    // Track which physical spans have already been claimed by a content entry so
    // that multiple content entries for the SAME answer (e.g. a collapsed answer
    // matching .ContentItem-title + .RichText + .AnswerCard) don't each render
    // their own Fact Check portal into the shared span.
    const claimed = new Set<HTMLElement>();
    contents.forEach((content) => {
      const parent = content.element;
      if (!parent) return;
      const escapedId =
        typeof CSS !== 'undefined' && CSS.escape
          ? CSS.escape(content.id)
          : content.id;
      const existing = parent.querySelector<HTMLElement>(
        `.${FACTCHECK_CLASS}[data-contentid="${escapedId}"]`,
      );
      if (existing) {
        if (!claimed.has(existing)) {
          claimed.add(existing);
          next.set(content.id, existing);
        }
        return;
      }
      const span = document.createElement('span');
      span.className = FACTCHECK_CLASS;
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';
      span.style.verticalAlign = 'middle';
      span.style.marginLeft = '0.75';
      // The fact-check button must sit next to the Block controls (the inline
      // block container), never at the first sentence of the answer. The block
      // container may live outside content.element's subtree (e.g. the author
      // header), so resolve it robustly: prefer one inside this content, then
      // one whose user link is inside this content, then the nearest block
      // container in the document. If none exists, skip insertion.
      let blockContainer = parent.querySelector<HTMLElement>(
        `.${INLINE_CLASS}`,
      );
      if (!blockContainer) {
        const userLink = parent.querySelector<HTMLElement>('.UserLink-link');
        if (
          userLink &&
          userLink.nextElementSibling?.classList.contains(INLINE_CLASS)
        ) {
          blockContainer = userLink.nextElementSibling as HTMLElement;
        }
      }
      if (!blockContainer) {
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>(`.${INLINE_CLASS}`),
        );
        blockContainer =
          candidates.find((c) =>
            content.element.contains(c.previousElementSibling),
          ) ??
          candidates[0] ??
          null;
      }
      if (!blockContainer) return;
      // Only one fact-check button per block container: if a fact-check
      // container is already attached to this block container (e.g. because
      // another content entry for the same answer resolved here too), reuse
      // it instead of stacking duplicate buttons.
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling && sibling.classList.contains(FACTCHECK_CLASS)) {
        if (!claimed.has(sibling)) {
          claimed.add(sibling);
          next.set(content.id, sibling);
        }
      } else if (!sibling) {
        blockContainer.insertAdjacentElement('afterend', span);
        claimed.add(span);
        next.set(content.id, span);
      }
      // If a non-fact-check sibling occupies the slot, leave it; this content
      // simply won't get its own button (another entry for the same answer will).
    });
    setFcContainers(next);
  }, [contents]);

  return (
    <ThemeProvider theme={createTheme()}>
      <>
        {users.map((user) => {
          const container = containers.get(user.id);
          if (!container) return null;
          const isBlocked = blocked.some((u) => u.id === user.id);
          return createPortal(
            <InlineControls
              isBlocked={isBlocked}
              onBlock={() => blockUser(user.id, user.name)}
              onUnblock={() => unblockUser(user.id)}
            />,
            container,
          );
        })}

        {contents.map((content) => {
          const container = fcContainers.get(content.id);
          if (!container) return null;
          return createPortal(
            <FactCheck
              text={content.text}
              enabled={factCheckEnabled}
              onFactCheck={runFactCheck}
            />,
            container,
          );
        })}
      </>
    </ThemeProvider>
  );
};

export default Blocker;
