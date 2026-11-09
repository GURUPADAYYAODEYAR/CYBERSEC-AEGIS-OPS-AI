import { renderIcon } from '../utils/icons.js';
import { formatSeverityBadge } from '../utils/formatting.js';
import { formatDateTime } from '../utils/dates.js';
import { escapeHtml } from '../utils/validators.js';
import { DetectionRulesRepository, AlertsRepository, EventsRepository } from '../storage/repositories.js';
import { DetectionEngine } from '../engine/DetectionEngine.js';

export class ThreatDetectionPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.rules = [];
    this.alerts = [];
    this.allEventsMap = new Map();
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Threat Detection Engine</h1>
            <p>Deterministic rule matching, behavioral baselines, and statistical Z-score anomaly evaluation.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-run-detection">
              ${renderIcon('ShieldAlert', { size: 14 })}
              <span>Run Detection Cycle</span>
            </button>
          </div>
        </div>

        <!-- Rules Catalog Accordion / Summary -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Shield', { size: 16, className: 'text-info' })}
              <span>Active Detection Rules Catalog</span>
            </span>
            <span class="badge badge-neutral" id="rules-count-badge">Loading...</span>
          </div>
          <div id="detection-rules-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
            <div class="text-secondary text-xs">Loading rules...</div>
          </div>
        </div>

        <!-- Triggered Alerts Section -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('AlertCircle', { size: 16, className: 'text-critical' })}
              <span>Evidence-Backed Security Alerts</span>
            </span>
            <span class="text-secondary text-xs" id="alerts-count-text">0 total alerts</span>
          </div>

          <div id="alerts-container" class="flex flex-col gap-3">
            <div class="text-secondary text-xs" style="padding: 16px 0;">Loading alerts...</div>
          </div>
        </div>
      </div>
    `;

    await this.loadData(container);
    this.attachEvents(container);
  }

  async loadData(container) {
    const [rules, alerts, events] = await Promise.all([
      DetectionRulesRepository.getAll(),
      AlertsRepository.getAll(),
      EventsRepository.getAll()
    ]);

    this.rules = rules;
    this.alerts = alerts;
    this.allEventsMap = new Map(events.map(e => [e.eventId, e]));

    // Render Rules Catalog
    const rulesBadge = container.querySelector('#rules-count-badge');
    if (rulesBadge) rulesBadge.textContent = `${rules.filter(r => r.enabled).length} Active / ${rules.length} Total Rules`;

    const rulesGrid = container.querySelector('#detection-rules-grid');
    if (rulesGrid) {
      rulesGrid.innerHTML = rules.map(rule => `
        <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="mono font-semibold" style="font-size: 11px; color: var(--accent-primary);">${escapeHtml(rule.ruleId)}</span>
              ${formatSeverityBadge(rule.severity)}
            </div>
            <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px;">
              ${escapeHtml(rule.name)}
            </div>
            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.3;">
              ${escapeHtml(rule.description)}
            </p>
          </div>
          <div class="flex items-center justify-between mt-2 pt-2" style="border-top: 1px solid var(--border-color); font-size: 10.5px;">
            <span class="mono text-muted">${escapeHtml(rule.mitreTactic || rule.category)}</span>
            <button class="btn btn-xs ${rule.enabled ? 'btn-subtle' : ''}" data-toggle-rule="${escapeHtml(rule.ruleId)}" style="font-size: 10px; padding: 1px 6px;">
              ${rule.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      `).join('');

      rulesGrid.querySelectorAll('[data-toggle-rule]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ruleId = btn.getAttribute('data-toggle-rule');
          await DetectionRulesRepository.toggleRule(ruleId);
          await this.loadData(container);
        });
      });
    }

    // Render Triggered Alerts Feed
    const alertsCountText = container.querySelector('#alerts-count-text');
    if (alertsCountText) alertsCountText.textContent = `${alerts.length} active alerts`;

    const alertsContainer = container.querySelector('#alerts-container');
    if (alertsContainer) {
      if (alerts.length === 0) {
        alertsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${renderIcon('ShieldCheck', { size: 36, className: 'text-success' })}</div>
            <div class="empty-state-title">No Unaddressed Threats Detected</div>
            <div class="empty-state-desc">Current normalized telemetry does not match any active detection heuristics or statistical outlier thresholds.</div>
          </div>
        `;
      } else {
        alertsContainer.innerHTML = alerts.map(alert => {
          const evidenceBadges = (alert.evidenceEventIds || []).map(evtId => {
            return `<button class="btn btn-xs mono" data-inspect-event="${escapeHtml(evtId)}" style="font-size: 10px; padding: 1px 5px;">${escapeHtml(evtId)}</button>`;
          }).join(' ');

          return `
            <div class="card" style="padding: 14px; border-left: 3px solid ${alert.severity === 'CRITICAL' ? 'var(--status-critical)' : alert.severity === 'HIGH' ? '#E05D52' : 'var(--status-warning)'};">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="mono font-semibold text-xs" style="color: var(--accent-primary);">${escapeHtml(alert.alertId)}</span>
                  <span class="badge badge-neutral text-xs">${escapeHtml(alert.ruleId)}</span>
                  ${formatSeverityBadge(alert.severity)}
                </div>
                <span class="text-muted text-xs mono">${formatDateTime(alert.timestamp)}</span>
              </div>

              <h3 style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                ${escapeHtml(alert.name)}
              </h3>

              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">
                ${escapeHtml(alert.explanation)}
              </p>

              <div class="flex items-center justify-between text-xs pt-2" style="border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
                <div class="flex items-center gap-2">
                  <span class="text-muted">Entity:</span>
                  <span class="mono font-semibold">${escapeHtml(alert.affectedEntity)}</span>
                  <span class="text-muted" style="margin-left: 8px;">Source:</span>
                  <span>${escapeHtml(alert.source)}</span>
                </div>

                ${alert.evidenceEventIds && alert.evidenceEventIds.length > 0 ? `
                  <div class="flex items-center gap-1">
                    <span class="text-muted">Evidence Events:</span>
                    ${evidenceBadges}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');

        // Attach event inspector listeners
        alertsContainer.querySelectorAll('[data-inspect-event]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const evtId = btn.getAttribute('data-inspect-event');
            const event = this.allEventsMap.get(evtId);
            if (event) {
              window.detailDrawer.inspectEvent(event);
            } else {
              alert(`Event ${evtId} not found in active database.`);
            }
          });
        });
      }
    }
  }

  attachEvents(container) {
    const runBtn = container.querySelector('#btn-run-detection');
    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.innerHTML = `<span>Evaluating algorithms...</span>`;
        await DetectionEngine.runFullDetection();
        await this.loadData(container);
        runBtn.disabled = false;
        runBtn.innerHTML = `${renderIcon('ShieldAlert', { size: 14 })} <span>Run Detection Cycle</span>`;
      });
    }
  }

  destroy() {}
}

