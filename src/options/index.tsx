import React from 'react';
import { createRoot } from 'react-dom/client';
import Options from './Options';

const container = document.getElementById('options-root');
if (container) {
  try {
    createRoot(container).render(<Options />);
  } catch (err) {
    container.innerHTML =
      '<pre style="color:red;white-space:pre-wrap;padding:8px;">' +
      String(err) +
      '</pre>';
     
    console.error(err);
  }
}
