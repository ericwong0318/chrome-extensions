import React from 'react';
import { createRoot } from 'react-dom/client';
import Blocker from './blocker/Blocker';
import { logError } from './logger';

const overlayId = 'my-extension-root';

// Capture unexpected runtime errors in the content script context.
if (typeof window !== 'undefined') {
  // Benign browser notifications that are not real errors and should not be
  // logged. The ResizeObserver loop message fires when a ResizeObserver
  // callback causes a layout change that re-triggers the observer (commonly
  // triggered by MUI components) — it is self-correcting and harmless.
  const isBenignError = (message?: string) =>
    !!message &&
    (message.includes(
      'ResizeObserver loop completed with undelivered notifications.',
    ) ||
      message.includes('ResizeObserver loop limit exceeded'));

  window.addEventListener('error', (e) => {
    if (isBenignError(e.message)) return;
    logError('Uncaught error in content script', e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason =
      e instanceof PromiseRejectionEvent ? String(e.reason) : 'unknown';
    logError('Unhandled promise rejection in content script', reason);
  });
}

if (!document.getElementById(overlayId)) {
  // 1. Create a secure host container
  const hostElement = document.createElement('div');
  hostElement.id = overlayId;
  document.body.appendChild(hostElement);

  // 2. Attach a Shadow Root to sandbox the extension's own UI/styles
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // 3. Mount React into an anchor inside the shadow root
  const reactRootAnchor = document.createElement('div');
  shadowRoot.appendChild(reactRootAnchor);

  createRoot(reactRootAnchor).render(
    <React.StrictMode>
      <Blocker />
    </React.StrictMode>,
  );
}
