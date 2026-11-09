import { renderIcon } from '../utils/icons.js';
import { DataStoreManager } from '../storage/repositories.js';
import { DetectionEngine } from '../engine/DetectionEngine.js';
import { CorrelationEngine } from '../engine/CorrelationEngine.js';

/**
 * College Demonstration Guided Tour Workflow (10 Steps).
 */
export class GuidedTour {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.currentStep = 1;
    this.totalSteps = 10;
    this.overlay = null;

    this.steps = [
      {
        step: 1,
        title: 'Step 1: Initialize Security Operations',
        description: 'Seeding local IndexedDB storage with baseline enterprise telemetry, synthetic identities, and cloud infrastructure.',
        targetRoute: 'overview',
        actionLabel: 'Initialize Telemetry',
        action: async () => {
          await DataStoreManager.initializeDefaultData(true);
        }
      },
      {
        step: 2,
        title: 'Step 2: Simulate Authentication Activity',
        description: 'Injecting brute force authentication attempts against Sarah Chen followed by foreign IP login.',
        targetRoute: 'simulation',
        actionLabel: 'Load Login Anomaly Scenario',
        action: async () => {}
      },
      {
        step: 3,
        title: 'Step 3: Run Threat Detection',
        description: 'Executing detection rules (brute-force window, impossible travel velocity, unseen device indicators).',
        targetRoute: 'detection',
        actionLabel: 'Run Detection Cycle',
        action: async () => {
          await DetectionEngine.runFullDetection();
        }
      },
      {
        step: 4,
        title: 'Step 4: Investigate Identity (AuthWatch)',
        description: 'Inspecting Sarah Chen in AuthWatch: calculate impossible travel velocity (Frankfurt to Tokyo in 11.5 mins, 48,000+ km/h) and examine risk scoring.',
        targetRoute: 'identity',
        actionLabel: 'Inspect Sarah Chen',
        action: async () => {}
      },
      {
        step: 5,
        title: 'Step 5: Review Cloud Misconfiguration (CloudFence)',
        description: 'Evaluating corporate S3 bucket with public read/write access and overprivileged wildcard IAM role.',
        targetRoute: 'cloud',
        actionLabel: 'Open CloudFence',
        action: async () => {}
      },
      {
        step: 6,
        title: 'Step 6: Correlate Cross-Module Events',
        description: 'Correlating auth compromise with cloud permissions modification and AI agent exploitation attempt.',
        targetRoute: 'graph',
        actionLabel: 'View Entity Graph',
        action: async () => {
          await CorrelationEngine.correlate();
        }
      },
      {
        step: 7,
        title: 'Step 7: Incident Investigation Workspace',
        description: 'Reviewing incident INC-2026-0881, chronological event timeline, affected assets, and analyst triage notes.',
        targetRoute: 'incidents',
        actionLabel: 'Open Incident Triage',
        action: async () => {}
      },
      {
        step: 8,
        title: 'Step 8: Simulate Cloud Remediation',
        description: 'Applying simulated remediation: enable S3 Public Access Block and restrict wildcard IAM permissions, re-evaluating posture.',
        targetRoute: 'cloud',
        actionLabel: 'Go to Cloud Posture',
        action: async () => {}
      },
      {
        step: 9,
        title: 'Step 9: Test AI Agent Defense (AgentGuard)',
        description: 'Evaluating indirect prompt injection inside invoice context and verifying tool whitelist policy gate.',
        targetRoute: 'agent',
        actionLabel: 'Run AI Security Test',
        action: async () => {}
      },
      {
        step: 10,
        title: 'Step 10: Generate Security Incident Report',
        description: 'Exporting executive and technical incident report with chronological timeline, evidence hashes, and simulated fix audit.',
        targetRoute: 'reports',
        actionLabel: 'Open Reports',
        action: async () => {}
      }
    ];
  }

  start() {
    this.currentStep = 1;
    this.render();
  }

  render() {
    this.close();

    const current = this.steps[this.currentStep - 1];

    const banner = document.createElement('div');
    banner.id = 'tour-banner-container';
    banner.style.position = 'fixed';
    banner.style.bottom = '20px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '9999';
    banner.style.width = '90%';
    banner.style.maxWidth = '680px';

    banner.innerHTML = `
      <div class="card" style="box-shadow: var(--shadow-lg); border: 2px solid var(--accent-primary); background-color: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="badge badge-info font-mono">DEMO STEP ${current.step}/${this.totalSteps}</span>
            <strong style="font-size: 13.5px; color: var(--text-primary);">${current.title}</strong>
          </div>
          <button class="btn btn-subtle btn-xs" id="close-tour-btn">${renderIcon('X', { size: 14 })}</button>
        </div>

        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
          ${current.description}
        </p>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1">
            <button class="btn btn-xs" id="tour-prev-btn" ${this.currentStep <= 1 ? 'disabled' : ''}>Previous</button>
            <span class="text-xs text-muted" style="margin: 0 4px;">Step ${this.currentStep} of ${this.totalSteps}</span>
            <button class="btn btn-xs" id="tour-next-btn" ${this.currentStep >= this.totalSteps ? 'disabled' : ''}>Next</button>
          </div>

          <button class="btn btn-primary btn-sm" id="tour-action-btn">
            ${renderIcon('ArrowRight', { size: 14 })}
            <span>${current.actionLabel}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('#close-tour-btn').addEventListener('click', () => this.close());

    banner.querySelector('#tour-prev-btn').addEventListener('click', () => {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.render();
      }
    });

    banner.querySelector('#tour-next-btn').addEventListener('click', () => {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.render();
      }
    });

    banner.querySelector('#tour-action-btn').addEventListener('click', async () => {
      const btn = banner.querySelector('#tour-action-btn');
      btn.disabled = true;
      btn.textContent = 'Processing...';

      if (current.action) {
        await current.action();
      }

      if (this.onNavigate && current.targetRoute) {
        this.onNavigate(current.targetRoute);
      }

      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.render();
      } else {
        this.close();
      }
    });

    this.overlay = banner;
  }

  close() {
    const existing = document.getElementById('tour-banner-container');
    if (existing) existing.remove();
    this.overlay = null;
  }
}

