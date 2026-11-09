import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { GuidedTour } from './components/GuidedTour.js';
import { Router } from './router.js';
import { DataStoreManager } from './storage/repositories.js';
import { DetectionEngine } from './engine/DetectionEngine.js';
import { CorrelationEngine } from './engine/CorrelationEngine.js';

export class App {
  constructor() {
    this.sidebar = null;
    this.header = null;
    this.router = null;
    this.tour = null;
  }

  async start() {
    // 1. Theme Initialization
    const savedTheme = localStorage.getItem('aegis-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 2. Data Initialization
    await DataStoreManager.initializeDefaultData(false);
    await DetectionEngine.runFullDetection();
    await CorrelationEngine.correlate();

    // 3. Layout Structure Assembly
    const appRoot = document.getElementById('app');
    if (!appRoot) throw new Error('#app root element not found');

    appRoot.innerHTML = `
      <div id="sidebar-mount"></div>
      <div class="main-wrapper">
        <div id="header-mount"></div>
        <main id="workspace-mount" style="flex: 1; overflow-y: auto; position: relative;"></main>
      </div>
    `;

    const sidebarMount = appRoot.querySelector('#sidebar-mount');
    const headerMount = appRoot.querySelector('#header-mount');
    const workspaceMount = appRoot.querySelector('#workspace-mount');

    // 4. Initialize Components
    this.sidebar = new Sidebar('overview', (route) => {
      this.router.navigate(route);
    });
    sidebarMount.innerHTML = this.sidebar.render();
    this.sidebar.attachEvents(sidebarMount);

    this.tour = new GuidedTour((route) => {
      this.router.navigate(route);
    });

    this.header = new Header(
      (searchTerm) => {
        if (searchTerm) {
          this.router.navigate('events');
        }
      },
      () => {
        this.tour.start();
      }
    );
    headerMount.innerHTML = this.header.render();
    this.header.attachEvents(headerMount);

    // 5. Initialize Router
    this.router = new Router(workspaceMount, this.sidebar);
    this.router.init();
  }
}
