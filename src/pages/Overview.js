import { renderIcon } from '../utils/icons.js';
import { formatSeverityBadge, formatStatusBadge, truncate } from '../utils/formatting.js';
import { formatDateTime } from '../utils/dates.js';
import { escapeHtml } from '../utils/validators.js';
import { SecurityCharts } from '../visualization/SecurityCharts.js';

import {
  EventsRepository,
  AlertsRepository,
  IncidentsRepository,
  IdentitiesRepository,
  CloudResourcesRepository,
  DataStoreManager
} from '../storage/repositories.js';

import { DetectionEngine } from '../engine/DetectionEngine.js';

export class OverviewPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.eventChart = null;
    this.sevChart = null;
    this.catChart = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Security Operations Overview</h1>
            <p>Unified enterprise threat intelligence, posture evaluation, and incident monitoring.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-quick-run-detection">
              ${renderIcon('ShieldAlert', { size: 14 })}
              <span>Run Detection</span>
            </button>
            <button class="btn btn-sm" id="btn-quick-reset">
              ${renderIcon('RotateCcw', { size: 14 })}
              <span>Reset Demo</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-quick-report">
              ${renderIcon('FileText', { size: 14 })}
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="metrics-grid" id="kpi-metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span>Analyzed Events</span>
              ${renderIcon('Terminal', { size: 14 })}
            </div>
            <div class="metric-value" id="kpi-events">—</div>
            <div class="metric-footer text-secondary">Normalized security telemetry</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Active Alerts</span>
              ${renderIcon('ShieldAlert', { size: 14, className: 'text-warning' })}
            </div>
            <div class="metric-value text-warning" id="kpi-alerts">—</div>
            <div class="metric-footer text-secondary">Triggered detection rules</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Open Incidents</span>
              ${renderIcon('AlertTriangle', { size: 14, className: 'text-critical' })}
            </div>
            <div class="metric-value text-critical" id="kpi-incidents">—</div>
            <div class="metric-footer text-secondary">Active investigation cases</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Cloud Violations</span>
              ${renderIcon('Cloud', { size: 14 })}
            </div>
            <div class="metric-value" id="kpi-cloud">—</div>
            <div class="metric-footer text-secondary">Posture policy findings</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Flagged Identities</span>
              ${renderIcon('Users', { size: 14 })}
            </div>
            <div class="metric-value" id="kpi-identities">—</div>
            <div class="metric-footer text-secondary">Risk score &gt; 50/100</div>
          </div>
        </div>

        <!-- Charts Row -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Activity', { size: 16, className: 'text-info' })}
                <span>Security Event Ingress Over Time</span>
              </span>
              <span class="badge badge-neutral">UTC Timeline</span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="overview-event-chart"></canvas>
            </div>
          </div>

          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Shield', { size: 16, className: 'text-warning' })}
                <span>Alerts by Severity</span>
              </span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="overview-sev-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Incidents & Recent Alerts Split -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Incident Queue -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('AlertTriangle', { size: 16, className: 'text-critical' })}
                <span>Active Incident Queue</span>
              </span>
              <button class="btn btn-xs btn-subtle" id="link-view-incidents">View All</button>
            </div>
            <div id="overview-incidents-list" class="flex flex-col gap-2">
              <div class="text-secondary text-xs">Loading active investigations...</div>
            </div>
          </div>

          <!-- Recent Alerts -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('ShieldAlert', { size: 16, className: 'text-warning' })}
                <span>Recent Security Alerts</span>
              </span>
              <button class="btn btn-xs btn-subtle" id="link-view-alerts">View All</button>
            </div>
            <div id="overview-alerts-list" class="flex flex-col gap-2">
              <div class="text-secondary text-xs">Loading alerts...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadData(container);
    this.attachEvents(container);
  }

  async loadData(container) {
    const [events, alerts, incidents, identities, cloudResources] = await Promise.all([
      EventsRepository.getAll(),
      AlertsRepository.getAll(),
      IncidentsRepository.getAll(),
      IdentitiesRepository.getAll(),
      CloudResourcesRepository.getAll()
    ]);

    // Update KPI numbers
    const kpiEvents = container.querySelector('#kpi-events');
    const kpiAlerts = container.querySelector('#kpi-alerts');
    const kpiIncidents = container.querySelector('#kpi-incidents');
    const kpiCloud = container.querySelector('#kpi-cloud');
    const kpiIdentities = container.querySelector('#kpi-identities');

    if (kpiEvents) kpiEvents.textContent = events.length.toLocaleString();
    if (kpiAlerts) kpiAlerts.textContent = alerts.length.toLocaleString();
    if (kpiIncidents) kpiIncidents.textContent = incidents.filter(i => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length;
    if (kpiCloud) {
      const violations = cloudResources.filter(r => r.isPublic || r.isOverprivileged || r.encrypted === false || r.loggingEnabled === false);
      kpiCloud.textContent = violations.length;
    }
    if (kpiIdentities) {
      const highRisk = identities.filter(i => (i.riskScore || 0) >= 50);
      kpiIdentities.textContent = highRisk.length;
    }

    // Render Event Activity Chart
    const eventCanvas = container.querySelector('#overview-event-chart');
    if (eventCanvas) {
      if (this.eventChart) this.eventChart.destroy();
      this.eventChart = SecurityCharts.renderEventActivityChart(eventCanvas, events);
    }

    // Render Severity Doughnut
    const sevCanvas = container.querySelector('#overview-sev-chart');
    if (sevCanvas) {
      if (this.sevChart) this.sevChart.destroy();
      this.sevChart = SecurityCharts.renderSeverityDoughnut(sevCanvas, alerts);
    }

    // Render Incidents List
    const incList = container.querySelector('#overview-incidents-list');
    if (incList) {
      if (incidents.length === 0) {
        incList.innerHTML = `<div class="text-secondary text-xs" style="padding: 12px 0;">No open incidents. All active threats contained.</div>`;
      } else {
        incList.innerHTML = incidents.slice(0, 4).map(inc => `
          <div class="card" style="padding: 10px; cursor: pointer; background-color: var(--bg-surface-hover);" data-inc-id="${escapeHtml(inc.incidentId)}">
            <div class="flex items-center justify-between mb-1">
              <span class="mono font-semibold" style="font-size: 12px; color: var(--accent-primary);">${escapeHtml(inc.incidentId)}</span>
              ${formatStatusBadge(inc.status)}
            </div>
            <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              ${escapeHtml(inc.title)}
            </div>
            <div class="flex items-center justify-between text-muted" style="font-size: 11px;">
              <span>Analyst: <strong>${escapeHtml(inc.assignedAnalyst || 'Unassigned')}</strong></span>
              <span>${formatDateTime(inc.updatedAt || inc.createdAt)}</span>
            </div>
          </div>
        `).join('');

        incList.querySelectorAll('[data-inc-id]').forEach(el => {
          el.addEventListener('click', () => {
            if (this.onNavigate) this.onNavigate('incidents');
          });
        });
      }
    }

    // Render Recent Alerts List
    const alertList = container.querySelector('#overview-alerts-list');
    if (alertList) {
      if (alerts.length === 0) {
        alertList.innerHTML = `<div class="text-secondary text-xs" style="padding: 12px 0;">Zero unacknowledged alerts. Detection baseline clear.</div>`;
      } else {
        alertList.innerHTML = alerts.slice(0, 4).map(alt => `
          <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
            <div class="flex items-center justify-between mb-1">
              <span class="mono text-muted" style="font-size: 11px;">${escapeHtml(alt.ruleId)}</span>
              ${formatSeverityBadge(alt.severity)}
            </div>
            <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
              ${escapeHtml(alt.name)}
            </div>
            <div class="text-secondary" style="font-size: 11.5px; line-height: 1.3; margin-bottom: 4px;">
              ${truncate(alt.explanation, 90)}
            </div>
            <div class="flex items-center justify-between text-muted" style="font-size: 11px;">
              <span>Entity: <strong class="mono">${escapeHtml(alt.affectedEntity)}</strong></span>
              <span>${formatDateTime(alt.timestamp)}</span>
            </div>
          </div>
        `).join('');
      }
    }
  }

  attachEvents(container) {
    const runBtn = container.querySelector('#btn-quick-run-detection');
    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Running Detection...';
        await DetectionEngine.runFullDetection();
        await this.loadData(container);
        runBtn.disabled = false;
        runBtn.innerHTML = `${renderIcon('ShieldAlert', { size: 14 })} <span>Run Detection</span>`;
      });
    }

    const resetBtn = container.querySelector('#btn-quick-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Reset demo dataset to initial factory state?')) {
          await DataStoreManager.resetToDemoDefaults();
          await this.loadData(container);
        }
      });
    }

    const reportBtn = container.querySelector('#btn-quick-report');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('reports');
      });
    }

    const linkInc = container.querySelector('#link-view-incidents');
    if (linkInc) {
      linkInc.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('incidents');
      });
    }

    const linkAlt = container.querySelector('#link-view-alerts');
    if (linkAlt) {
      linkAlt.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('detection');
      });
    }
  }

  destroy() {
    if (this.eventChart) this.eventChart.destroy();
    if (this.sevChart) this.sevChart.destroy();
    if (this.catChart) this.catChart.destroy();
  }
}

