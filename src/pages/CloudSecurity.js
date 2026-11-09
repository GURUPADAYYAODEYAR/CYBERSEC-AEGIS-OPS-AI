import { renderIcon } from '../utils/icons.js';
import { formatSeverityBadge } from '../utils/formatting.js';
import { escapeHtml } from '../utils/validators.js';
import { CloudResourcesRepository, EventsRepository } from '../storage/repositories.js';
import { CloudRules } from '../detection/CloudRules.js';
import { DetectionEngine } from '../engine/DetectionEngine.js';

export class CloudSecurityPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.resources = [];
    this.findings = [];
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>CloudFence — Cloud Security Posture Analysis</h1>
            <p>Offline configuration audit, exposure path evaluation, and interactive remediation simulator.</p>
          </div>
          <div class="page-actions">
            <span class="badge badge-neutral">100% Offline Simulation</span>
          </div>
        </div>

        <!-- Posture Summary Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span>Audited Resources</span>
              ${renderIcon('Cloud', { size: 14 })}
            </div>
            <div class="metric-value" id="cloud-total-res">—</div>
            <div class="metric-footer text-secondary">Synthetic cloud assets</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Policy Violations</span>
              ${renderIcon('AlertCircle', { size: 14, className: 'text-critical' })}
            </div>
            <div class="metric-value text-critical" id="cloud-total-violations">—</div>
            <div class="metric-footer text-secondary">Active posture failures</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Remediated Assets</span>
              ${renderIcon('ShieldCheck', { size: 14, className: 'text-success' })}
            </div>
            <div class="metric-value text-success" id="cloud-remediated-count">—</div>
            <div class="metric-footer text-secondary">Simulated policy fixes</div>
          </div>
        </div>

        <!-- Active Violations & Remediation Action Feed -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('ShieldAlert', { size: 16, className: 'text-warning' })}
              <span>Active Policy Violations & Remediation Engine</span>
            </span>
            <span class="text-secondary text-xs" id="cloud-findings-count">0 findings</span>
          </div>

          <div id="cloud-violations-mount" class="flex flex-col gap-3">
            <div class="text-secondary text-xs">Evaluating cloud posture...</div>
          </div>
        </div>

        <!-- Resource Inventory Table -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Server', { size: 16, className: 'text-info' })}
              <span>Cloud Infrastructure Inventory</span>
            </span>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Public Exposure</th>
                  <th>Encryption</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="cloud-inventory-body">
                <tr><td colspan="7" class="text-center p-3 text-muted">Loading inventory...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadData(container);
  }

  async loadData(container) {
    this.resources = await CloudResourcesRepository.getAll();
    this.findings = CloudRules.evaluateCloudPosture(this.resources);

    // Update KPI metrics
    const totalRes = container.querySelector('#cloud-total-res');
    const totalViolations = container.querySelector('#cloud-total-violations');
    const remediatedCount = container.querySelector('#cloud-remediated-count');
    const findingsCount = container.querySelector('#cloud-findings-count');

    if (totalRes) totalRes.textContent = this.resources.length;
    if (totalViolations) totalViolations.textContent = this.findings.length;
    if (remediatedCount) {
      const fixed = this.resources.filter(r => r.remediatedAt).length;
      remediatedCount.textContent = fixed;
    }
    if (findingsCount) findingsCount.textContent = `${this.findings.length} active violations`;

    // Render Policy Violations
    const violationsMount = container.querySelector('#cloud-violations-mount');
    if (violationsMount) {
      if (this.findings.length === 0) {
        violationsMount.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${renderIcon('ShieldCheck', { size: 36, className: 'text-success' })}</div>
            <div class="empty-state-title">Cloud Infrastructure Fully Hardened</div>
            <div class="empty-state-desc">All storage buckets, IAM roles, ingress rules, and encryption settings comply with enterprise posture baselines.</div>
          </div>
        `;
      } else {
        violationsMount.innerHTML = this.findings.map(finding => {
          return `
            <div class="card" style="padding: 14px; border-left: 3px solid ${finding.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)'};">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="mono font-semibold text-xs text-info">${escapeHtml(finding.policyId)}</span>
                  ${formatSeverityBadge(finding.severity)}
                  <span class="badge badge-neutral text-xs mono">${escapeHtml(finding.resourceId)}</span>
                </div>
                <button class="btn btn-primary btn-xs" data-remediate-res="${escapeHtml(finding.resourceId)}" data-remediate-act="${escapeHtml(finding.remediationAction)}">
                  ${renderIcon('ShieldCheck', { size: 12 })}
                  <span>Simulate Remediation</span>
                </button>
              </div>

              <h3 style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                ${escapeHtml(finding.title)}
              </h3>

              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">
                ${escapeHtml(finding.technicalExplanation)}
              </p>

              <div class="card" style="padding: 8px; background-color: var(--bg-surface-hover); font-size: 11.5px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <strong class="text-secondary">Recommended Fix:</strong>
                  <span class="text-primary" style="margin-left: 6px;">${escapeHtml(finding.suggestedRemediation)}</span>
                </div>
                <span class="mono text-muted text-xs">Action: ${escapeHtml(finding.remediationAction)}</span>
              </div>
            </div>
          `;
        }).join('');

        // Attach Remediation Triggers
        violationsMount.querySelectorAll('[data-remediate-res]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const resId = btn.getAttribute('data-remediate-res');
            const act = btn.getAttribute('data-remediate-act');
            btn.disabled = true;
            btn.textContent = 'Applying fix...';

            await CloudResourcesRepository.remediate(resId, act);

            // Log an administrative audit event for the remediation
            await EventsRepository.add({
              eventId: `evt-rem-${Date.now()}`,
              timestamp: new Date().toISOString(),
              source: 'CloudFence_Remediator',
              eventType: 'ADMIN_ACTION',
              action: `REMEDIATION_${act}`,
              outcome: 'SUCCESS',
              userId: 'user-schen',
              sourceIp: '127.0.0.1',
              destinationIp: '169.254.169.254',
              hostname: 'cloudfence-daemon',
              resourceId: resId,
              severity: 'INFO',
              metadata: { action: act, status: 'REMEDIATED_SIMULATION' }
            });

            // Re-evaluate detection engine
            await DetectionEngine.runFullDetection();
            await this.loadData(container);
          });
        });
      }
    }

    // Render Inventory Table
    const invBody = container.querySelector('#cloud-inventory-body');
    if (invBody) {
      invBody.innerHTML = this.resources.map(res => {
        const isExposed = res.isPublic || (res.ingressRules && res.ingressRules.some(r => r.isRisky));
        const isEncrypted = res.encrypted === true;

        return `
          <tr>
            <td class="font-semibold text-primary">
              ${escapeHtml(res.resourceName || res.resourceId)}
              <div class="mono text-muted text-xs">${escapeHtml(res.resourceId)}</div>
            </td>
            <td><span class="badge badge-neutral">${escapeHtml(res.resourceType)}</span></td>
            <td class="mono text-xs">${escapeHtml(res.region || 'global')}</td>
            <td>
              ${isExposed
                ? '<span class="badge badge-critical">PUBLIC EXPOSURE</span>'
                : '<span class="badge badge-success">PROTECTED</span>'
              }
            </td>
            <td>
              ${res.encrypted !== undefined
                ? (isEncrypted ? '<span class="badge badge-success">KMS ENCRYPTED</span>' : '<span class="badge badge-warning">UNENCRYPTED</span>')
                : '<span class="text-muted text-xs">N/A</span>'
              }
            </td>
            <td class="mono text-xs">${escapeHtml(res.owner || 'system')}</td>
            <td>
              ${res.remediatedAt
                ? '<span class="badge badge-success">REMEDIATED</span>'
                : (isExposed ? '<span class="badge badge-critical">NON-COMPLIANT</span>' : '<span class="badge badge-neutral">COMPLIANT</span>')
              }
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  destroy() {}
}
