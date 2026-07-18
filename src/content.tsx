import React from 'react';
import { createRoot } from 'react-dom/client';
import Overlay from './overlay/Overlay';
import { logError } from './logger';

const overlayId = 'my-extension-root';

// Capture unexpected runtime errors in the content script context.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    logError('Uncaught error in content script', e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e instanceof PromiseRejectionEvent ? String(e.reason) : 'unknown';
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
      <Overlay />
    </React.StrictMode>
  );
}