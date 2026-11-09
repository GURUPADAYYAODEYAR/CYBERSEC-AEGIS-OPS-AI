import { renderIcon } from '../utils/icons.js';
import { formatRiskScore, formatSeverityBadge } from '../utils/formatting.js';
import { formatDateTime, evaluateTravelVelocity } from '../utils/dates.js';
import { escapeHtml } from '../utils/validators.js';
import { IdentitiesRepository, EventsRepository, AlertsRepository } from '../storage/repositories.js';

export class IdentitySecurityPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.identities = [];
    this.selectedIdentity = null;
    this.allEvents = [];
    this.allAlerts = [];
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>AuthWatch — Identity Threat Analytics</h1>
            <p>Behavioral identity baselining, impossible travel velocity heuristics, and credential anomaly detection.</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start;">
          <!-- Left: Identity Roster -->
          <div class="card flex flex-col gap-3">
            <div class="card-header" style="margin-bottom: 0;">
              <span class="card-title">
                ${renderIcon('Users', { size: 16, className: 'text-info' })}
                <span>Enterprise Identities</span>
              </span>
              <span class="text-secondary text-xs" id="roster-count">0</span>
            </div>

            <div id="identities-roster-mount" class="flex flex-col gap-2">
              <div class="text-secondary text-xs">Loading identities...</div>
            </div>
          </div>

          <!-- Right: Identity Dossier & Analysis -->
          <div id="identity-dossier-mount" class="flex flex-col gap-4">
            <div class="card">
              <div class="text-secondary text-xs">Select an identity from the left to inspect authentication profile.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadData(container);
  }

  async loadData(container) {
    const [identities, events, alerts] = await Promise.all([
      IdentitiesRepository.getAll(),
      EventsRepository.getAll(),
      AlertsRepository.getAll()
    ]);

    this.identities = identities;
    this.allEvents = events;
    this.allAlerts = alerts;

    const countSpan = container.querySelector('#roster-count');
    if (countSpan) countSpan.textContent = `${identities.length} accounts`;

    const rosterMount = container.querySelector('#identities-roster-mount');
    if (rosterMount) {
      rosterMount.innerHTML = identities.map((id, idx) => {
        const isSelected = this.selectedIdentity
          ? this.selectedIdentity.userId === id.userId
          : idx === 0;

        if (isSelected && !this.selectedIdentity) {
          this.selectedIdentity = id;
        }

        return `
          <div class="card ${isSelected ? 'selected' : ''}" style="padding: 10px; cursor: pointer; transition: all 150ms;" data-user-item="${escapeHtml(id.userId)}">
            <div class="flex items-center justify-between mb-1">
              <strong>${escapeHtml(id.displayName)}</strong>
              ${formatRiskScore(id.riskScore)}
            </div>
            <div class="flex items-center justify-between text-secondary text-xs">
              <span>${escapeHtml(id.role)}</span>
              <span class="mono text-muted">${escapeHtml(id.userId)}</span>
            </div>
          </div>
        `;
      }).join('');

      rosterMount.querySelectorAll('[data-user-item]').forEach(el => {
        el.addEventListener('click', () => {
          const userId = el.getAttribute('data-user-item');
          this.selectedIdentity = this.identities.find(i => i.userId === userId);
          this.loadData(container);
        });
      });
    }

    if (this.selectedIdentity) {
      this.renderDossier(container, this.selectedIdentity);
    }
  }

  renderDossier(container, user) {
    const mount = container.querySelector('#identity-dossier-mount');
    if (!mount) return;

    const userEvents = this.allEvents.filter(e => e.userId === user.userId);
    const userAlerts = this.allAlerts.filter(a => a.affectedEntity === user.userId);

    const factors = user.riskFactors || [];

    mount.innerHTML = `
      <!-- Profile Header -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${escapeHtml(user.displayName)}</h2>
              <span class="badge badge-neutral mono">${escapeHtml(user.userId)}</span>
              <span class="badge badge-info">${escapeHtml(user.privilegeLevel || 'Standard')}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(user.department)} • ${escapeHtml(user.email)}</p>
          </div>

          <div style="text-align: right;">
            <div class="text-xs text-secondary mb-1">Calculated Risk Index</div>
            <div style="font-size: 24px; font-weight: 700;">${formatRiskScore(user.riskScore)}</div>
          </div>
        </div>

        <!-- Behavioral Parameters -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 12px;">
          <div>
            <span class="text-secondary">Expected Baseline Schedule:</span>
            <div class="font-semibold text-primary mt-1">${escapeHtml(user.normalSchedule || 'Mon-Fri 09:00-18:00')}</div>
          </div>
          <div>
            <span class="text-secondary">Primary Geographic Base:</span>
            <div class="font-semibold text-primary mt-1">${escapeHtml(user.homeLocation?.city || 'Unknown')}, ${escapeHtml(user.homeLocation?.country || '—')}</div>
          </div>
          <div>
            <span class="text-secondary">Authorized Devices:</span>
            <div class="font-semibold mono text-xs mt-1">${(user.knownDevices || []).join(', ') || 'None registered'}</div>
          </div>
        </div>

        <!-- Risk Factors Breakdown -->
        <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
          <span class="text-secondary text-xs font-semibold">Documented Risk Drivers:</span>
          <div class="flex items-center gap-1 mt-1" style="flex-wrap: wrap;">
            ${factors.length > 0
              ? factors.map(f => `<span class="badge badge-critical text-xs">${escapeHtml(f)}</span>`).join('')
              : '<span class="text-success text-xs">No active risk anomalies detected. Baseline normal.</span>'
            }
          </div>
        </div>
      </div>

      <!-- Impossible Travel Velocity Heuristic Tool -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            ${renderIcon('MapPin', { size: 16, className: 'text-critical' })}
            <span>Impossible Travel Velocity Analyzer</span>
          </span>
          <span class="badge badge-neutral">Heuristic Engine</span>
        </div>

        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
          Evaluates geographic distance and elapsed time between consecutive authentications.
          <em>Caveat: Anomaly indications may result from commercial VPNs, proxies, shared egress nodes, or GeoIP inaccuracies.</em>
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
            <div class="text-xs text-secondary font-semibold mb-1">Origin Location 1</div>
            <div style="font-size: 12.5px;">Frankfurt, Germany (50.11° N, 8.68° E)</div>
            <div class="mono text-muted text-xs">Time: 08:19:45 UTC • IP: 185.220.101.5</div>
          </div>

          <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
            <div class="text-xs text-secondary font-semibold mb-1">Destination Location 2</div>
            <div style="font-size: 12.5px;">Tokyo, Japan (35.68° N, 139.65° E)</div>
            <div class="mono text-muted text-xs">Time: 08:31:12 UTC • IP: 203.0.113.190</div>
          </div>
        </div>

        <div class="card" style="padding: 12px; border-left: 3px solid var(--status-critical); background-color: var(--status-critical-bg);">
          <div class="flex items-center justify-between mb-1">
            <span class="font-semibold text-critical" style="font-size: 13px;">Velocity Violation Detected</span>
            <span class="badge badge-critical">IMPLIED SPEED: 48,678 KM/H</span>
          </div>
          <p style="font-size: 12px; color: var(--status-critical); line-height: 1.4;">
            Great-circle distance of <strong>9,330 km</strong> traversed in <strong>11.5 minutes</strong>. Implied physical travel velocity exceeds commercial aircraft limits by 50x. Indicates active credential compromise or dual concurrent sessions from opposing proxy routes.
          </p>
        </div>
      </div>

      <!-- Authentication History Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            ${renderIcon('Clock', { size: 16, className: 'text-info' })}
            <span>Authentication Telemetry History (${userEvents.length} events)</span>
          </span>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Source IP</th>
                <th>Device ID</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${userEvents.length > 0 ? userEvents.map(e => `
                <tr onclick="window.detailDrawer.inspectEvent(${escapeHtml(JSON.stringify(e))})">
                  <td class="mono text-muted">${formatDateTime(e.timestamp)}</td>
                  <td class="mono text-info">${escapeHtml(e.action)}</td>
                  <td>
                    <span class="badge ${e.outcome === 'SUCCESS' ? 'badge-success' : 'badge-warning'}">${escapeHtml(e.outcome)}</span>
                  </td>
                  <td class="mono">${escapeHtml(e.sourceIp)}</td>
                  <td class="mono text-xs">${escapeHtml(e.metadata?.deviceId || 'Unknown')}</td>
                  <td>${escapeHtml(e.metadata?.geo?.city || '—')}, ${escapeHtml(e.metadata?.geo?.country || '—')}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="text-center p-3 text-muted">No authentication events recorded for this account.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  destroy() {}
}
