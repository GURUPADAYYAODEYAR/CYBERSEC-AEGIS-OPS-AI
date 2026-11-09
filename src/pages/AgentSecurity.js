import { renderIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/validators.js';
import { formatSeverityBadge } from '../utils/formatting.js';
import { SEED_AGENT_TEST_CASES } from '../storage/seedData.js';
import { PolicyEvaluator } from '../agent/PolicyEvaluator.js';
import { SecurityTestRunner } from '../agent/SecurityTestRunner.js';

export class AgentSecurityPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.selectedTest = SEED_AGENT_TEST_CASES[0];
    this.lastEvaluation = null;
    this.testResults = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>AgentGuard — AI Agent Security & Prompt Defense</h1>
            <p>Trust boundary isolation, indirect prompt-injection interception, and tool permission whitelisting.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-run-all-tests">
              ${renderIcon('Play', { size: 14 })}
              <span>Run Automated Test Suite</span>
            </button>
          </div>
        </div>

        <!-- Evaluation Metrics Header -->
        <div class="metrics-grid" id="agent-metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span>Security Benchmark</span>
              ${renderIcon('Bot', { size: 14 })}
            </div>
            <div class="metric-value" id="metric-pass-rate">100%</div>
            <div class="metric-footer text-secondary">Policy alignment rate</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Attacks Intercepted</span>
              ${renderIcon('ShieldCheck', { size: 14, className: 'text-success' })}
            </div>
            <div class="metric-value text-success" id="metric-blocked-count">3 Blocked</div>
            <div class="metric-footer text-secondary">Adversarial payloads halted</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span>Legitimate Actions</span>
              ${renderIcon('Activity', { size: 14, className: 'text-info' })}
            </div>
            <div class="metric-value text-info" id="metric-allowed-count">1 Allowed</div>
            <div class="metric-footer text-secondary">Authorized benign workflows</div>
          </div>
        </div>

        <!-- Test Case Selector Dropdown -->
        <div class="card" style="padding: 12px;">
          <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 10px;">
            <div class="flex items-center gap-2">
              <span class="text-secondary text-xs font-semibold">Select Evaluation Scenario:</span>
              <select class="select" id="agent-test-select" style="min-width: 320px;">
                ${SEED_AGENT_TEST_CASES.map(t => `
                  <option value="${t.testId}" ${t.testId === this.selectedTest.testId ? 'selected' : ''}>
                    ${t.name} (${t.expectedOutcome})
                  </option>
                `).join('')}
              </select>
            </div>

            <button class="btn btn-primary btn-sm" id="btn-eval-selected">
              ${renderIcon('Shield', { size: 14 })}
              <span>Evaluate Policy Boundary</span>
            </button>
          </div>
        </div>

        <!-- Trust Boundary Isolation Panes -->
        <div class="trust-boundary-box">
          <!-- Trusted Pane -->
          <div class="trust-pane trusted flex flex-col gap-2">
            <div class="flex items-center justify-between mb-1">
              <span class="flex items-center gap-1 font-semibold text-xs text-success">
                ${renderIcon('ShieldCheck', { size: 14 })}
                <span>TRUSTED BOUNDARY: System Instructions & Allowed Tools</span>
              </span>
              <span class="badge badge-success">High Authority</span>
            </div>

            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs font-semibold">Target AI Agent Role:</span>
              <div class="font-semibold text-primary mt-1" id="disp-agent-name">${this.selectedTest.targetAgent}</div>
            </div>

            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover); flex: 1;">
              <span class="text-secondary text-xs font-semibold">System Defense Policy:</span>
              <pre class="mono text-primary text-xs mt-1" id="disp-system-policy" style="white-space: pre-wrap; line-height: 1.4;">${escapeHtml(this.selectedTest.systemPolicy)}</pre>
            </div>
          </div>

          <!-- Untrusted Pane -->
          <div class="trust-pane untrusted flex flex-col gap-2">
            <div class="flex items-center justify-between mb-1">
              <span class="flex items-center gap-1 font-semibold text-xs text-critical">
                ${renderIcon('AlertTriangle', { size: 14 })}
                <span>UNTRUSTED INPUT: User Prompt & External Retrieved Context</span>
              </span>
              <span class="badge badge-critical">Zero Authority</span>
            </div>

            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs font-semibold">User Prompt:</span>
              <div class="text-primary text-xs mt-1 font-mono" id="disp-user-prompt">${escapeHtml(this.selectedTest.userPrompt)}</div>
            </div>

            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover); flex: 1;">
              <span class="text-secondary text-xs font-semibold">Retrieved Document (Potential Injection Vector):</span>
              <pre class="mono text-xs mt-1 text-critical" id="disp-retrieved-doc" style="white-space: pre-wrap; line-height: 1.4; background-color: var(--status-critical-bg); padding: 8px; border-radius: 4px;">${escapeHtml(this.selectedTest.retrievedDocument)}</pre>
            </div>
          </div>
        </div>

        <!-- Decision Gate Result Box -->
        <div class="card" id="agent-decision-box">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Activity', { size: 16, className: 'text-info' })}
              <span>Policy Evaluation Decision Gate</span>
            </span>
            <span class="badge badge-neutral" id="eval-status-badge">Awaiting Evaluation</span>
          </div>

          <div id="eval-decision-content">
            <div class="text-secondary text-xs p-2">Click "Evaluate Policy Boundary" or "Run Automated Test Suite" to simulate inspection.</div>
          </div>
        </div>
      </div>
    `;

    this.runSingleEvaluation(container, this.selectedTest);
    this.attachEvents(container);
  }

  runSingleEvaluation(container, testCase) {
    const evaluation = PolicyEvaluator.evaluate({
      systemPolicy: testCase.systemPolicy,
      userPrompt: testCase.userPrompt,
      retrievedDocument: testCase.retrievedDocument,
      proposedAction: testCase.proposedAction
    });

    this.lastEvaluation = evaluation;

    const statusBadge = container.querySelector('#eval-status-badge');
    const decisionMount = container.querySelector('#eval-decision-content');

    const isDenied = evaluation.decision === 'DENIED';

    if (statusBadge) {
      statusBadge.className = isDenied ? 'badge badge-critical' : 'badge badge-success';
      statusBadge.textContent = isDenied ? 'EXECUTION BLOCKED' : 'EXECUTION ALLOWED';
    }

    if (decisionMount) {
      decisionMount.innerHTML = `
        <div class="card" style="padding: 14px; border-left: 4px solid ${isDenied ? 'var(--status-critical)' : 'var(--status-success)'}; background-color: var(--bg-surface-hover);">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm" style="color: ${isDenied ? 'var(--status-critical)' : 'var(--status-success)'};">
                POLICY DECISION: ${evaluation.decision}
              </span>
              <span class="badge badge-neutral mono text-xs">${evaluation.triggeredRule || 'BASELINE_PASS'}</span>
            </div>
            ${formatSeverityBadge(evaluation.riskLevel)}
          </div>

          <p style="font-size: 13px; color: var(--text-primary); line-height: 1.4; margin-bottom: 10px;">
            ${escapeHtml(evaluation.reason)}
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; border-top: 1px solid var(--border-color); padding-top: 8px;">
            <div>
              <span class="text-secondary font-semibold">Simulated Tool Requested:</span>
              <div class="mono text-info mt-1 font-semibold">${escapeHtml(testCase.proposedAction?.tool || 'none')}</div>
            </div>

            <div>
              <span class="text-secondary font-semibold">Defensive Verification:</span>
              <div class="text-primary mt-1">${isDenied ? 'Payload safely neutralized before execution' : 'Satisfies least-privilege boundary'}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  attachEvents(container) {
    const select = container.querySelector('#agent-test-select');
    if (select) {
      select.addEventListener('change', (e) => {
        const testId = e.target.value;
        this.selectedTest = SEED_AGENT_TEST_CASES.find(t => t.testId === testId);

        container.querySelector('#disp-agent-name').textContent = this.selectedTest.targetAgent;
        container.querySelector('#disp-system-policy').textContent = this.selectedTest.systemPolicy;
        container.querySelector('#disp-user-prompt').textContent = this.selectedTest.userPrompt;
        container.querySelector('#disp-retrieved-doc').textContent = this.selectedTest.retrievedDocument;

        this.runSingleEvaluation(container, this.selectedTest);
      });
    }

    const evalBtn = container.querySelector('#btn-eval-selected');
    if (evalBtn) {
      evalBtn.addEventListener('click', () => {
        this.runSingleEvaluation(container, this.selectedTest);
      });
    }

    const runAllBtn = container.querySelector('#btn-run-all-tests');
    if (runAllBtn) {
      runAllBtn.addEventListener('click', () => {
        const suite = SecurityTestRunner.runAllTests(SEED_AGENT_TEST_CASES);

        container.querySelector('#metric-pass-rate').textContent = `${suite.passRate}%`;
        container.querySelector('#metric-blocked-count').textContent = `${suite.blockedCount} Blocked`;
        container.querySelector('#metric-allowed-count').textContent = `${suite.allowedCount} Allowed`;

        alert(`Automated Suite Completed:\nTotal Tests: ${suite.totalTests}\nPassed Policies: ${suite.passedCount}\nAccuracy: ${suite.passRate}%`);
      });
    }
  }

  destroy() {}
}
