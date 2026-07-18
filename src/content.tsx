import React from 'react';
import { createRoot } from 'react-dom/client';
import Overlay from './overlay/Overlay';

const overlayId = 'my-extension-root';

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