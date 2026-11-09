import { renderIcon } from '../utils/icons.js';

/**
 * Sidebar Navigation Component.
 */
export class Sidebar {
  constructor(activeRoute = 'overview', onNavigate) {
    this.activeRoute = activeRoute;
    this.onNavigate = onNavigate;
    this.isCollapsed = false;
  }

  render() {
    const navItems = [
      { section: 'OPERATIONS' },
      { id: 'overview', label: 'Security Overview', icon: 'Activity' },
      { id: 'events', label: 'Security Events', icon: 'Terminal' },
      { id: 'detection', label: 'Threat Detection', icon: 'ShieldAlert' },
      { id: 'incidents', label: 'Incident Investigation', icon: 'AlertTriangle' },

      { section: 'MODULES' },
      { id: 'identity', label: 'AuthWatch (Identity)', icon: 'Users' },
      { id: 'cloud', label: 'CloudFence (Cloud)', icon: 'Cloud' },
      { id: 'agent', label: 'AgentGuard (AI Defense)', icon: 'Bot' },

      { section: 'INTELLIGENCE & LAB' },
      { id: 'graph', label: 'Entity Graph', icon: 'Network' },
      { id: 'analytics', label: 'Security Analytics', icon: 'BarChart3' },
      { id: 'simulation', label: 'Simulation Lab', icon: 'FlaskConical' },
      { id: 'reports', label: 'Reports', icon: 'FileText' },
      { id: 'settings', label: 'Settings & Data', icon: 'Settings' }
    ];

    const navHtml = navItems.map(item => {
      if (item.section) {
        return `<div class="nav-section-title">${item.section}</div>`;
      }
      const isActive = this.activeRoute === item.id;
      return `
        <a class="nav-item ${isActive ? 'active' : ''}" data-route="${item.id}" href="#/${item.id}">
          ${renderIcon(item.icon, { size: 16 })}
          <span class="nav-label">${item.label}</span>
        </a>
      `;
    }).join('');

    return `
      <aside class="sidebar ${this.isCollapsed ? 'collapsed' : ''}" id="app-sidebar">
        <div class="sidebar-header">
          <div class="brand" data-route="overview">
            <div class="brand-icon">A</div>
            <div class="brand-info">
              <span class="brand-name">AEGIS OPS AI</span>
              <span class="brand-tagline">Detect • Investigate • Defend</span>
            </div>
          </div>
          <button class="btn btn-subtle btn-xs" id="sidebar-toggle" title="Toggle Sidebar">
            ${renderIcon('ChevronLeft', { size: 14 })}
          </button>
        </div>

        <nav class="sidebar-nav">
          ${navHtml}
        </nav>

        <div class="sidebar-footer">
          <span class="flex items-center gap-1">
            <span class="status-dot success"></span>
            <span>Local Engine Active</span>
          </span>
          <span class="mono text-muted">v1.0.0</span>
        </div>
      </aside>
    `;
  }

  attachEvents(container) {
    const sidebar = container.querySelector('#app-sidebar');
    const toggleBtn = container.querySelector('#sidebar-toggle');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        this.isCollapsed = !this.isCollapsed;
        sidebar.classList.toggle('collapsed', this.isCollapsed);
      });
    }

    const navLinks = container.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (this.onNavigate) this.onNavigate(route);
      });
    });

    const brand = container.querySelector('.brand');
    if (brand) {
      brand.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('overview');
      });
    }
  }

  setActive(route) {
    this.activeRoute = route;
    const links = document.querySelectorAll('.nav-item');
    links.forEach(link => {
      const match = link.getAttribute('data-route') === route;
      link.classList.toggle('active', match);
    });
  }
}
