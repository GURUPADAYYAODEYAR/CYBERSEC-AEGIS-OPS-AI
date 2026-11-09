import { renderIcon } from '../utils/icons.js';
import { formatSeverityBadge, formatStatusBadge } from '../utils/formatting.js';
import { formatDateTime } from '../utils/dates.js';
import { escapeHtml } from '../utils/validators.js';
import { IncidentsRepository, EventsRepository, AlertsRepository } from '../storage/repositories.js';

export class IncidentsPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.incidents = [];
    this.selectedIncident = null;
    this.allEventsMap = new Map();
    this.allAlertsMap = new Map();
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Incident Investigation Workspace</h1>
            <p>Correlated multi-stage security incidents, chronological forensic timelines, and analyst triage notes.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-sm" id="btn-export-incident-report">
              ${renderIcon('FileText', { size: 14 })}
              <span>Export Incident Report</span>
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start;">
          <!-- Left: Incident Queue -->
          <div class="card flex flex-col gap-3" style="max-height: calc(100vh - 180px); overflow-y: auto;">
            <div class="card-header" style="margin-bottom: 0;">
              <span class="card-title">
                ${renderIcon('AlertTriangle', { size: 16, className: 'text-critical' })}
                <span>Incidents</span>
              </span>
              <span class="badge badge-neutral" id="incidents-badge-count">0</span>
            </div>

            <div id="incidents-queue-list" class="flex flex-col gap-2">
              <div class="text-secondary text-xs">Loading incidents...</div>
            </div>
          </div>

          <!-- Right: Active Investigation Details -->
          <div id="active-incident-details" class="flex flex-col gap-4">
            <div class="card">
              <div class="text-secondary text-xs">Select an incident from the queue to inspect evidence timeline.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadData(container);
    this.attachEvents(container);
  }

  async loadData(container) {
    const [incidents, events, alerts] = await Promise.all([
      IncidentsRepository.getAll(),
      EventsRepository.getAll(),
      AlertsRepository.getAll()
    ]);

    this.incidents = incidents;
    this.allEventsMap = new Map(events.map(e => [e.eventId, e]));
    this.allAlertsMap = new Map(alerts.map(a => [a.alertId, a]));

    const countBadge = container.querySelector('#incidents-badge-count');
    if (countBadge) countBadge.textContent = incidents.length;

    const queueList = container.querySelector('#incidents-queue-list');
    if (queueList) {
      if (incidents.length === 0) {
        queueList.innerHTML = `<div class="text-secondary text-xs p-3">No incidents created.</div>`;
      } else {
        queueList.innerHTML = incidents.map((inc, idx) => {
          const isSelected = this.selectedIncident
            ? this.selectedIncident.incidentId === inc.incidentId
            : idx === 0;

          if (isSelected && !this.selectedIncident) {
            this.selectedIncident = inc;
          }

          return `
            <div class="card ${isSelected ? 'selected' : ''}" style="padding: 10px; cursor: pointer; transition: all 150ms;" data-incident-item="${escapeHtml(inc.incidentId)}">
              <div class="flex items-center justify-between mb-1">
                <span class="mono font-semibold text-xs" style="color: var(--accent-primary);">${escapeHtml(inc.incidentId)}</span>
                ${formatStatusBadge(inc.status)}
              </div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                ${escapeHtml(inc.title)}
              </div>
              <div class="flex items-center justify-between text-muted text-xs">
                ${formatSeverityBadge(inc.severity)}
                <span class="mono">${formatDateTime(inc.createdAt)}</span>
              </div>
            </div>
          `;
        }).join('');

        queueList.querySelectorAll('[data-incident-item]').forEach(el => {
          el.addEventListener('click', () => {
            const incId = el.getAttribute('data-incident-item');
            this.selectedIncident = this.incidents.find(i => i.incidentId === incId);
            this.loadData(container);
          });
        });
      }
    }

    if (this.selectedIncident) {
      await this.renderIncidentDetails(container, this.selectedIncident);
    }
  }

  async renderIncidentDetails(container, incident) {
    const detailsMount = container.querySelector('#active-incident-details');
    if (!detailsMount) return;

    const notes = await IncidentsRepository.getNotes(incident.incidentId);

    // Build timeline events
    const timelineItems = [];

    // Triggering alerts
    (incident.triggeringAlerts || []).forEach(altId => {
      const alt = this.allAlertsMap.get(altId);
      if (alt) {
        timelineItems.push({
          type: 'ALERT',
          timestamp: alt.timestamp,
          title: `Alert: ${alt.name}`,
          desc: alt.explanation,
          severity: alt.severity
        });
      }
    });

    // Evidence events
    (incident.evidenceEventIds || []).forEach(evtId => {
      const evt = this.allEventsMap.get(evtId);
      if (evt) {
        timelineItems.push({
          type: 'EVENT',
          timestamp: evt.timestamp,
          title: `Event: ${evt.action} (${evt.outcome})`,
          desc: `Source: ${evt.source} • User: ${evt.userId} • IP: ${evt.sourceIp}`,
          severity: evt.severity,
          eventRef: evt
        });
      }
    });

    // Sort timeline chronologically ascending
    timelineItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const timelineHtml = timelineItems.map(item => {
      const markerClass = item.severity === 'CRITICAL' ? 'critical' : item.severity === 'HIGH' ? 'warning' : 'info';
      return `
        <div class="timeline-item">
          <div class="timeline-marker ${markerClass}"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">${escapeHtml(item.title)}</span>
              <span class="timeline-time mono">${formatDateTime(item.timestamp)}</span>
            </div>
            <div class="timeline-desc">${escapeHtml(item.desc)}</div>
          </div>
        </div>
      `;
    }).join('');

    const notesHtml = notes.map(n => `
      <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover); margin-bottom: 8px;">
        <div class="flex items-center justify-between mb-1 text-xs">
          <strong>${escapeHtml(n.author)}</strong>
          <span class="mono text-muted">${formatDateTime(n.timestamp)}</span>
        </div>
        <p style="font-size: 12.5px; color: var(--text-primary); line-height: 1.4;">${escapeHtml(n.text)}</p>
      </div>
    `).join('');

    detailsMount.innerHTML = `
      <!-- Incident Overview Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="mono font-semibold" style="font-size: 14px; color: var(--accent-primary);">${escapeHtml(incident.incidentId)}</span>
              ${formatSeverityBadge(incident.severity)}
              ${formatStatusBadge(incident.status)}
            </div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${escapeHtml(incident.title)}</h2>
          </div>

          <div class="flex items-center gap-2">
            <!-- Status Dropdown -->
            <select class="select" id="incident-status-select" style="width: 140px;">
              <option value="OPEN" ${incident.status === 'OPEN' ? 'selected' : ''}>Open</option>
              <option value="INVESTIGATING" ${incident.status === 'INVESTIGATING' ? 'selected' : ''}>Investigating</option>
              <option value="CONTAINED (SIMULATED)" ${incident.status === 'CONTAINED (SIMULATED)' ? 'selected' : ''}>Contained</option>
              <option value="RESOLVED" ${incident.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
              <option value="CLOSED" ${incident.status === 'CLOSED' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
        </div>

        <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
          ${escapeHtml(incident.summary)}
        </p>

        <!-- Metadata row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
          <div>
            <span class="text-secondary">Assigned Lead:</span>
            <select class="select mt-1" id="assign-analyst-select">
              <option value="Alex Rivera (SecOps Lead)" ${incident.assignedAnalyst === 'Alex Rivera (SecOps Lead)' ? 'selected' : ''}>Alex Rivera (SecOps Lead)</option>
              <option value="Sarah Chen (Cloud Lead)" ${incident.assignedAnalyst === 'Sarah Chen (Cloud Lead)' ? 'selected' : ''}>Sarah Chen (Cloud Lead)</option>
              <option value="Jordan Taylor (DevOps Lead)" ${incident.assignedAnalyst === 'Jordan Taylor (DevOps Lead)' ? 'selected' : ''}>Jordan Taylor (DevOps Lead)</option>
            </select>
          </div>

          <div>
            <span class="text-secondary">Connected Entities:</span>
            <div class="flex items-center gap-1 mt-1" style="flex-wrap: wrap;">
              ${(incident.entities || []).map(ent => `<span class="badge badge-neutral mono text-xs">${escapeHtml(ent)}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Chronological Evidence Timeline -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            ${renderIcon('Clock', { size: 16, className: 'text-info' })}
            <span>Forensic Evidence Timeline</span>
          </span>
          <span class="text-secondary text-xs">${timelineItems.length} sequential milestones</span>
        </div>

        <div class="timeline" style="margin-top: 8px;">
          ${timelineHtml.length > 0 ? timelineHtml : '<div class="text-muted text-xs">No chronological milestones linked.</div>'}
        </div>
      </div>

      <!-- Analyst Triage Notes -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            ${renderIcon('FileText', { size: 16, className: 'text-warning' })}
            <span>Analyst Investigation Notes</span>
          </span>
          <span class="text-secondary text-xs">${notes.length} notes</span>
        </div>

        <div class="flex flex-col gap-2 mb-3" id="incident-notes-mount">
          ${notesHtml.length > 0 ? notesHtml : '<div class="text-muted text-xs">No analyst notes recorded yet.</div>'}
        </div>

        <!-- Add Note Input -->
        <div class="flex gap-2">
          <input type="text" class="input" id="new-note-text" placeholder="Add forensic observation, triage finding, or containment action...">
          <button class="btn btn-primary btn-sm" id="btn-add-note">
            ${renderIcon('Plus', { size: 14 })}
            <span>Add Note</span>
          </button>
        </div>
      </div>
    `;

    // Status change listener
    const statusSelect = detailsMount.querySelector('#incident-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        incident.status = newStatus;
        await IncidentsRepository.updateStatus(incident.incidentId, newStatus);
        await IncidentsRepository.addNote(
          incident.incidentId,
          'Alex Rivera (SecOps Lead)',
          `Investigation status changed to ${newStatus}.`
        );
        await this.loadData(container);
      });
    }

    // Analyst assignment listener
    const analystSelect = detailsMount.querySelector('#assign-analyst-select');
    if (analystSelect) {
      analystSelect.addEventListener('change', async (e) => {
        const analyst = e.target.value;
        incident.assignedAnalyst = analyst;
        await IncidentsRepository.assignAnalyst(incident.incidentId, analyst);
        await IncidentsRepository.addNote(
          incident.incidentId,
          'System Coordinator',
          `Incident reassigned to ${analyst}.`
        );
        await this.loadData(container);
      });
    }

    // Add note listener
    const addNoteBtn = detailsMount.querySelector('#btn-add-note');
    const noteInput = detailsMount.querySelector('#new-note-text');
    if (addNoteBtn && noteInput) {
      addNoteBtn.addEventListener('click', async () => {
        const text = noteInput.value.trim();
        if (!text) return;
        await IncidentsRepository.addNote(incident.incidentId, incident.assignedAnalyst || 'Alex Rivera (SecOps)', text);
        noteInput.value = '';
        await this.loadData(container);
      });
    }
  }

  attachEvents(container) {
    const reportBtn = container.querySelector('#btn-export-incident-report');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate('reports');
      });
    }
  }

  destroy() {}
}
