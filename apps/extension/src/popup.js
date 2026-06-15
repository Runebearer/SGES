import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './popup/Popup';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(createElement(Popup));
}
