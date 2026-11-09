import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

import { App } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new App();
    await app.start();
  } catch (err) {
    console.error('Fatal initialization error in AEGIS OPS AI:', err);
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: #C93C45;">
        <h2>AEGIS OPS AI Initialization Error</h2>
        <pre>${err.stack || err.message}</pre>
      </div>
    `;
  }
});
