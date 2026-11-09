import { renderIcon } from '../utils/icons.js';
import { DeveloperModal } from './DeveloperModal.js';

/**
 * Top App Header Component.
 */
export class Header {
  constructor(onSearch, onStartTour) {
    this.onSearch = onSearch;
    this.onStartTour = onStartTour;
  }

  render() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    return `
      <header class="app-header">
        <div class="header-left">
          <div class="header-search">
            <span class="header-search-icon">${renderIcon('Search', { size: 14 })}</span>
            <input type="text" class="input" id="global-search-input" placeholder="Search events, IPs, users, alerts (Ctrl+K)...">
          </div>
          <button class="btn btn-sm btn-subtle" id="btn-start-tour" title="Guided College Project Demonstration">
            ${renderIcon('Play', { size: 13, className: 'text-success' })}
            <span>Demo Tour</span>
          </button>
        </div>

        <div class="header-right">
          <!-- Light/Dark Mode Switcher -->
          <button class="btn btn-subtle btn-sm" id="btn-theme-toggle" title="Toggle Light / Dark Mode">
            <span id="theme-icon">${renderIcon(isDark ? 'Sun' : 'Moon', { size: 14 })}</span>
            <span id="theme-label" style="font-size: 11.5px;">${isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <!-- Top Right Developer Button -->
          <button class="dev-pill" id="btn-open-dev" title="View Lead Developer Profile">
            ${renderIcon('Code', { size: 13, className: 'text-info' })}
            <span>&lt;/&gt; DEVELOPER</span>
          </button>
        </div>
      </header>
    `;
  }

  attachEvents(container) {
    // Search Event
    const searchInput = container.querySelector('#global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.onSearch) this.onSearch(e.target.value.trim());
      });
      // Global hotkey Ctrl+K
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }

    // Theme Toggle
    const themeBtn = container.querySelector('#btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('aegis-theme', nextTheme);

        const iconContainer = container.querySelector('#theme-icon');
        const labelContainer = container.querySelector('#theme-label');
        if (iconContainer && labelContainer) {
          iconContainer.innerHTML = renderIcon(nextTheme === 'dark' ? 'Sun' : 'Moon', { size: 14 });
          labelContainer.textContent = nextTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }

        // Notify charts or graphs if needed
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: nextTheme } }));
      });
    }

    // Developer Profile
    const devBtn = container.querySelector('#btn-open-dev');
    if (devBtn) {
      devBtn.addEventListener('click', () => {
        DeveloperModal.render();
      });
    }

    // Tour Button
    const tourBtn = container.querySelector('#btn-start-tour');
    if (tourBtn) {
      tourBtn.addEventListener('click', () => {
        if (this.onStartTour) this.onStartTour();
      });
    }
  }
}
