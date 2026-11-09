import { OverviewPage } from './pages/Overview.js';
import { EventsPage } from './pages/Events.js';
import { ThreatDetectionPage } from './pages/ThreatDetection.js';
import { IncidentsPage } from './pages/Incidents.js';
import { IdentitySecurityPage } from './pages/IdentitySecurity.js';
import { CloudSecurityPage } from './pages/CloudSecurity.js';
import { AgentSecurityPage } from './pages/AgentSecurity.js';
import { EntityGraphPage } from './pages/EntityGraphPage.js';
import { AnalyticsPage } from './pages/Analytics.js';
import { SimulationLabPage } from './pages/SimulationLab.js';
import { ReportsPage } from './pages/Reports.js';
import { SettingsPage } from './pages/Settings.js';

export class Router {
  constructor(mountElement, sidebar) {
    this.mountElement = mountElement;
    this.sidebar = sidebar;
    this.currentPage = null;
    this.currentRoute = null;

    this.routes = {
      overview: (nav) => new OverviewPage(nav),
      events: (nav) => new EventsPage(nav),
      detection: (nav) => new ThreatDetectionPage(nav),
      incidents: (nav) => new IncidentsPage(nav),
      identity: (nav) => new IdentitySecurityPage(nav),
      cloud: (nav) => new CloudSecurityPage(nav),
      agent: (nav) => new AgentSecurityPage(nav),
      graph: (nav) => new EntityGraphPage(nav),
      analytics: (nav) => new AnalyticsPage(nav),
      simulation: (nav) => new SimulationLabPage(nav),
      reports: (nav) => new ReportsPage(nav),
      settings: (nav) => new SettingsPage(nav)
    };
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();
  }

  navigate(route) {
    window.location.hash = `#/${route}`;
  }

  async handleRouting() {
    let hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash || !this.routes[hash]) {
      hash = 'overview';
    }

    if (this.currentRoute === hash && this.currentPage) {
      return;
    }

    if (this.currentPage && typeof this.currentPage.destroy === 'function') {
      this.currentPage.destroy();
    }

    this.currentRoute = hash;
    this.sidebar.setActive(hash);

    const pageFactory = this.routes[hash];
    this.currentPage = pageFactory((target) => this.navigate(target));

    this.mountElement.innerHTML = '';
    await this.currentPage.render(this.mountElement);
    this.mountElement.scrollTop = 0;
  }
}
