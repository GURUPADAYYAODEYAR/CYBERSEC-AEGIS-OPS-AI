import { renderIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/validators.js';
import { EntityGraph } from '../visualization/EntityGraph.js';
import {
  IdentitiesRepository,
  CloudResourcesRepository,
  IncidentsRepository,
  EventsRepository
} from '../storage/repositories.js';

export class EntityGraphPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.graphInstance = null;
    this.rawElements = [];
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Unified Entity Relationship Graph</h1>
            <p>Graph-based correlation connecting compromised accounts, egress IPs, cloud infrastructure, and active incidents.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-graph-fit">
              ${renderIcon('Maximize2', { size: 14 })}
              <span>Fit to Screen</span>
            </button>
            <button class="btn btn-sm" id="btn-graph-zoom-in">
              ${renderIcon('Plus', { size: 14 })}
            </button>
            <button class="btn btn-sm" id="btn-graph-zoom-out">
              ${renderIcon('Minus', { size: 14 })}
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start;">
          <!-- Graph Canvas Container -->
          <div class="cytoscape-container" id="cy-viewport">
            <!-- Legend inside container -->
            <div class="graph-legend">
              <div class="legend-item">
                <span class="legend-color" style="background-color: #2563EB;"></span>
                <span>User / Identity</span>
              </div>
              <div class="legend-item">
                <span class="legend-color" style="background-color: #8B5CF6;"></span>
                <span>IP Address</span>
              </div>
              <div class="legend-item">
                <span class="legend-color" style="background-color: #D97706;"></span>
                <span>Cloud Asset</span>
              </div>
              <div class="legend-item">
                <span class="legend-color" style="background-color: #C93C45;"></span>
                <span>Incident / Alert</span>
              </div>
            </div>
          </div>

          <!-- Right: Selected Entity Inspector -->
          <div class="card" id="graph-entity-inspector">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Network', { size: 16, className: 'text-info' })}
                <span>Entity Inspector</span>
              </span>
            </div>
            <div id="inspector-content">
              <div class="text-secondary text-xs">
                Click on any node in the graph to inspect connected blast radius, relationships, and forensic events.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.initGraph(container);
    this.attachEvents(container);
  }

  async initGraph(container) {
    const [identities, cloudResources, incidents, events] = await Promise.all([
      IdentitiesRepository.getAll(),
      CloudResourcesRepository.getAll(),
      IncidentsRepository.getAll(),
      EventsRepository.getAll()
    ]);

    const viewport = container.querySelector('#cy-viewport');
    if (!viewport) return;

    this.rawElements = EntityGraph.buildGraphElements({
      identities,
      cloudResources,
      incidents,
      events
    });

    this.graphInstance = new EntityGraph(viewport, (nodeData) => {
      this.renderNodeDetails(container, nodeData);
    });

    this.graphInstance.init(this.rawElements);
  }

  renderNodeDetails(container, nodeData) {
    const mount = container.querySelector('#inspector-content');
    if (!mount) return;

    if (!nodeData) {
      mount.innerHTML = `
        <div class="text-secondary text-xs">
          Click on any node in the graph to inspect connected blast radius, relationships, and forensic events.
        </div>
      `;
      return;
    }

    const typeBadges = {
      USER: '<span class="badge badge-info">USER ACCOUNT</span>',
      IP: '<span class="badge badge-neutral mono">IP ADDRESS</span>',
      CLOUD_RESOURCE: '<span class="badge badge-warning">CLOUD ASSET</span>',
      INCIDENT: '<span class="badge badge-critical">SECURITY INCIDENT</span>'
    };

    mount.innerHTML = `
      <div class="flex flex-col gap-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="mono text-muted text-xs">${escapeHtml(nodeData.id)}</span>
            ${typeBadges[nodeData.type] || ''}
          </div>
          <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHtml(nodeData.label)}</h3>
        </div>

        <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover); font-size: 12px;">
          <span class="text-secondary font-semibold">Entity Attributes:</span>
          <pre class="mono mt-1 text-xs" style="max-height: 200px; overflow-y: auto;">${escapeHtml(JSON.stringify(nodeData.rawData || {}, null, 2))}</pre>
        </div>

        ${nodeData.type === 'USER' ? `
          <button class="btn btn-primary btn-sm w-full" id="btn-inspect-user-auth">
            ${renderIcon('Users', { size: 14 })}
            <span>Investigate in AuthWatch</span>
          </button>
        ` : nodeData.type === 'INCIDENT' ? `
          <button class="btn btn-critical btn-sm w-full" id="btn-open-incident-detail">
            ${renderIcon('AlertTriangle', { size: 14 })}
            <span>Open Incident Workspace</span>
          </button>
        ` : ''}
      </div>
    `;

    const userBtn = mount.querySelector('#btn-inspect-user-auth');
    if (userBtn) {
      userBtn.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('identity');
      });
    }

    const incBtn = mount.querySelector('#btn-open-incident-detail');
    if (incBtn) {
      incBtn.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('incidents');
      });
    }
  }

  attachEvents(container) {
    const fitBtn = container.querySelector('#btn-graph-fit');
    if (fitBtn) fitBtn.addEventListener('click', () => this.graphInstance?.fit());

    const zoomIn = container.querySelector('#btn-graph-zoom-in');
    if (zoomIn) zoomIn.addEventListener('click', () => this.graphInstance?.zoomIn());

    const zoomOut = container.querySelector('#btn-graph-zoom-out');
    if (zoomOut) zoomOut.addEventListener('click', () => this.graphInstance?.zoomOut());
  }

  destroy() {
    if (this.graphInstance) {
      this.graphInstance.destroy();
      this.graphInstance = null;
    }
  }
}

