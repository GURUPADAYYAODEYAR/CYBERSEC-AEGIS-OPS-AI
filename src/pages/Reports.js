import { renderIcon } from '../utils/icons.js';
import { formatSeverityBadge, formatStatusBadge } from '../utils/formatting.js';
import { formatDateTime } from '../utils/dates.js';
import { escapeHtml } from '../utils/validators.js';
import { IncidentsRepository, EventsRepository, AlertsRepository, CloudResourcesRepository } from '../storage/repositories.js';
import { downloadFile } from '../utils/csv.js';

export class ReportsPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.incidents = [];
    this.selectedIncident = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Forensic Incident Reports</h1>
            <p>Exportable executive summaries, audit logs, and technical incident dossiers for stakeholders.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-print-report">
              ${renderIcon('Printer', { size: 14 })}
              <span>Print to PDF</span>
            </button>
            <button class="btn btn-sm" id="btn-export-report-json">
              ${renderIcon('Download', { size: 14 })}
              <span>Export Report JSON</span>
            </button>
          </div>
        </div>

        <!-- Incident Selector -->
        <div class="card" style="padding: 12px;">
          <div class="flex items-center gap-2">
            <span class="text-secondary text-xs font-semibold">Select Incident to Compile:</span>
            <select class="select" id="report-incident-select" style="max-width: 420px;">
              <option value="">Loading incidents...</option>
            </select>
          </div>
        </div>

        <!-- Printable Document Container -->
        <div class="card" id="printable-report-document" style="padding: 32px; background-color: var(--bg-surface); border: 1px solid var(--border-color);">
          <div class="text-secondary text-xs">Compiling forensic report...</div>
        </div>
      </div>
    `;

    await this.loadData(container);
    this.attachEvents(container);
  }

  async loadData(container) {
    this.incidents = await IncidentsRepository.getAll();

    const select = container.querySelector('#report-incident-select');
    if (select && this.incidents.length > 0) {
      select.innerHTML = this.incidents.map(inc => `
        <option value="${inc.incidentId}">
          ${inc.incidentId} — ${inc.title} (${inc.severity})
        </option>
      `).join('');

      this.selectedIncident = this.incidents[0];
      await this.compileReport(container, this.selectedIncident);

      select.addEventListener('change', async (e) => {
        const id = e.target.value;
        this.selectedIncident = this.incidents.find(i => i.incidentId === id);
        await this.compileReport(container, this.selectedIncident);
      });
    }
  }

  async compileReport(container, incident) {
    const docMount = container.querySelector('#printable-report-document');
    if (!docMount || !incident) return;

    const [events, alerts, notes, cloudResources] = await Promise.all([
      EventsRepository.getAll(),
      AlertsRepository.getAll(),
      IncidentsRepository.getNotes(incident.incidentId),
      CloudResourcesRepository.getAll()
    ]);

    const eventsMap = new Map(events.map(e => [e.eventId, e]));
    const alertsMap = new Map(alerts.map(a => [a.alertId, a]));

    const triggeringAlertsList = (incident.triggeringAlerts || [])
      .map(id => alertsMap.get(id))
      .filter(Boolean);

    const evidenceEventsList = (incident.evidenceEventIds || [])
      .map(id => eventsMap.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    docMount.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--text-primary); padding-bottom: 16px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: var(--text-primary);">AEGIS OPS AI</div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px;">Security Operations Center • Incident Investigation Report</div>
          </div>
          <div style="text-align: right;">
            <div class="mono" style="font-size: 14px; font-weight: 700; color: var(--accent-primary);">${escapeHtml(incident.incidentId)}</div>
            <div class="text-muted text-xs">Generated: ${formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        <!-- Executive Meta Table -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background-color: var(--bg-surface-hover); padding: 14px; border-radius: 4px; font-size: 12px;">
          <div>
            <span class="text-secondary">Incident Classification:</span>
            <div class="mt-1">${formatSeverityBadge(incident.severity)}</div>
          </div>
          <div>
            <span class="text-secondary">Status:</span>
            <div class="mt-1">${formatStatusBadge(incident.status)}</div>
          </div>
          <div>
            <span class="text-secondary">Assigned Lead:</span>
            <div class="font-semibold text-primary mt-1">${escapeHtml(incident.assignedAnalyst || 'Unassigned')}</div>
          </div>
          <div>
            <span class="text-secondary">Triage Window:</span>
            <div class="mono text-muted text-xs mt-1">${formatDateTime(incident.createdAt)}</div>
          </div>
        </div>

        <!-- Executive Summary -->
        <div>
          <h2 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">1. EXECUTIVE SUMMARY</h2>
          <p style="font-size: 12.5px; color: var(--text-primary); line-height: 1.5;">
            ${escapeHtml(incident.summary)}
          </p>
        </div>

        <!-- Triggering Alerts -->
        <div>
          <h2 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">2. CORRELATED DETECTION ALERTS</h2>
          <div class="flex flex-col gap-2">
            ${triggeringAlertsList.map(alt => `
              <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
                <div class="flex items-center justify-between mb-1 text-xs">
                  <span class="mono font-semibold text-info">${escapeHtml(alt.ruleId)} — ${escapeHtml(alt.name)}</span>
                  ${formatSeverityBadge(alt.severity)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(alt.explanation)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Chronological Timeline -->
        <div>
          <h2 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">3. FORENSIC EVENT EVIDENCE STREAM</h2>
          <table class="data-table" style="font-size: 11.5px;">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Source</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Actor (User)</th>
                <th>Source IP</th>
              </tr>
            </thead>
            <tbody>
              ${evidenceEventsList.map(e => `
                <tr>
                  <td class="mono text-muted">${formatDateTime(e.timestamp)}</td>
                  <td><strong>${escapeHtml(e.source)}</strong></td>
                  <td class="mono text-info">${escapeHtml(e.action)}</td>
                  <td><span class="badge ${e.outcome === 'SUCCESS' ? 'badge-success' : 'badge-warning'}">${escapeHtml(e.outcome)}</span></td>
                  <td class="mono">${escapeHtml(e.userId)}</td>
                  <td class="mono">${escapeHtml(e.sourceIp)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Analyst Notes -->
        <div>
          <h2 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">4. ANALYST TRIAGE & CONTAINMENT LOG</h2>
          <div class="flex flex-col gap-2">
            ${notes.map(n => `
              <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
                <div class="flex items-center justify-between mb-1 text-xs">
                  <strong>${escapeHtml(n.author)}</strong>
                  <span class="mono text-muted">${formatDateTime(n.timestamp)}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-primary);">${escapeHtml(n.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Limitations & Disclaimer -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; font-size: 11px; color: var(--text-muted); line-height: 1.4;">
          <strong>Educational Simulation Notice:</strong> This report is produced by AEGIS OPS AI for defensive demonstration and security analytics research. All telemetry, IP addresses, credentials, and entity representations are safe synthetic simulations. No live endpoints or production environments were modified or accessed.
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    const printBtn = container.querySelector('#btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const exportBtn = container.querySelector('#btn-export-report-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!this.selectedIncident) return;
        const reportJson = JSON.stringify(this.selectedIncident, null, 2);
        downloadFile(reportJson, `aegis-incident-report-${this.selectedIncident.incidentId}.json`, 'application/json');
      });
    }
  }

  destroy() {}
}
