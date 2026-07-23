import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import { ControlsContainer } from './ControlsBase';
import { useBlocker, BlockButton, INLINE_CLASS } from '../hooks/blockUser';
import { FactCheckButton } from './FactCheckButton';
import { logError } from '../utils';
import { normalizeFactCheckConfigs } from '../hooks/factcheck/storage';

// Types
type ZhihuContent = { id: string; text: string; element: HTMLElement };

// Constants
const FACTCHECK_CLASS = 'zhihu-factcheck-inline';
const CONTENT_SELECTORS = ['.RichText', '.ContentItem-title', '.AnswerCard', '.QuestionAnswer-content'];

// DOM helpers
const getZhihuContent = (): ZhihuContent[] => {
  try {
    const nodes = Array.from(document.querySelectorAll(CONTENT_SELECTORS.join(',')));
    const byAnchor = new Map<HTMLElement, ZhihuContent>();
    nodes.forEach((el) => {
      const node = el as HTMLElement;
      const text = (node.innerText || node.textContent || '').trim();
      if (!text || text.length < 20) return;
      const anchor = (node.closest('.List-item, .ContentItem') as HTMLElement) || (node.closest('.AnswerCard, .QuestionAnswer-content') as HTMLElement) || node;
      const existing = byAnchor.get(anchor);
      if (!existing) {
        const id = anchor.getAttribute('data-id') || text.slice(0, 40);
        byAnchor.set(anchor, { id, text, element: anchor });
      } else {
        if (text.length > existing.text.length) existing.text = text;
        if (!existing.element.getAttribute('data-id') && node.getAttribute('data-id')) {
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


/**
 * Main wrapper that composes both Block User and Fact Check controls.
 * Manages storage sync, DOM scanning, and portal injection.
 */
export const ContentControls: React.FC = () => {
  const { blocked, users, blockContainers, blockUser, unblockUser } = useBlocker();
  // blockContainers is managed by the useBlocker hook for DOM injection
  const [contents, setContents] = useState<ZhihuContent[]>([]);
  const [factCheckEnabled, setFactCheckEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [timeoutSec, setTimeoutSec] = useState(9);
  const scanTimer = useRef<number | undefined>(undefined);

  // Load storage on mount
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    const load = () => {
      chrome.storage.sync.get({ factCheckConfigs: null, factCheckConfig: null, factCheckTimeoutSec: 9 }, (r) => {
        const cfgs = normalizeFactCheckConfigs(r.factCheckConfigs, r.factCheckConfig);
        setFactCheckEnabled(cfgs.length > 0);
        if (cfgs.length > 0) setLanguage(cfgs[0].language || 'en');
        if (typeof r.factCheckTimeoutSec === 'number') setTimeoutSec(r.factCheckTimeoutSec);
      });
    };
    load();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'sync') return;
      if (changes.factCheckConfigs || changes.factCheckConfig || changes.factCheckTimeoutSec) load();
    };
    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Scan DOM for content
  useEffect(() => {
    const scan = () => {
      setContents((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        getZhihuContent().forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });
    };
    scan();
    const observer = new MutationObserver(() => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(scan, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (scanTimer.current) window.clearTimeout(scanTimer.current); };
  }, []);

  // Fact check runner
  const runFactCheck = (text: string): Promise<unknown> => {
    return new Promise((resolve) => {
      if (!chrome.runtime?.connect) { resolve({ error: 'Extension unavailable.' }); return; }
      const port = chrome.runtime.connect({ name: 'factCheck' });
      let settled = false;
      const finish = (val: unknown) => { if (settled) return; settled = true; try { port.disconnect(); } catch { /* port already closed */ } resolve(val); };
      port.onMessage.addListener((msg: unknown) => {
        if (!msg) { finish({ error: 'No response.' }); return; }
        if (typeof msg === 'object' && msg && 'stage' in msg) { return; } // stage handled inline in FactCheckButton
        if (typeof msg === 'object' && msg && 'disabled' in msg) { finish({ error: 'No provider configured.' }); return; }
        if (typeof msg === 'object' && msg && 'error' in msg) { finish({ error: (msg as { error: string }).error }); return; }
        finish(msg.result);
      });
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) finish({ error: chrome.runtime.lastError.message });
        else if (!settled) finish({ error: 'Connection closed.' });
      });
      port.postMessage({ text, language, timeoutSec });
    });
  };


  // Container injection for fact check buttons
  const [fcContainers, setFcContainers] = useState<Map<string, HTMLElement>>(new Map());
  useEffect(() => {
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.${FACTCHECK_CLASS}[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = FACTCHECK_CLASS;
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector(`.${INLINE_CLASS}`);
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains(INLINE_CLASS)) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(`.${INLINE_CLASS}`));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains(FACTCHECK_CLASS)) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });
    setFcContainers(next);
  }, [contents]);

  return (
    <ControlsContainer>
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
    </ControlsContainer>
  );
};