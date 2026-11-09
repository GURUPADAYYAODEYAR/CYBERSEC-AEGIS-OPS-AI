import { renderIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/validators.js';
import { formatSeverityBadge } from '../utils/formatting.js';
import { formatDateTime } from '../utils/dates.js';
import { ScenarioEngine, SCENARIOS } from '../engine/ScenarioEngine.js';

export class SimulationLabPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.engine = new ScenarioEngine();
    this.activeScenarioId = 'scenario-1';
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Defensive Simulation Laboratory</h1>
            <p>Interactive playback of realistic attack scenarios, kill chains, and benign control baselines.</p>
          </div>
          <div class="page-actions">
            <span class="badge badge-neutral">Deterministic Telemetry Engine</span>
          </div>
        </div>

        <!-- Scenario Selection Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;" id="scenario-cards-grid">
          ${SCENARIOS.map(sc => `
            <div class="card ${sc.id === this.activeScenarioId ? 'selected' : ''}" style="cursor: pointer; padding: 12px; transition: all 150ms;" data-sc-id="${sc.id}">
              <div class="flex items-center justify-between mb-1">
                <span class="badge badge-info text-xs">${escapeHtml(sc.category)}</span>
                <span class="mono text-muted text-xs">${sc.eventsCount} events</span>
              </div>
              <h3 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(sc.name)}</h3>
              <p style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.3;">${escapeHtml(sc.description)}</p>
            </div>
          `).join('')}
        </div>

        <!-- Simulation Control Bar -->
        <div class="card" style="padding: 14px;">
          <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 12px;">
            <div class="flex items-center gap-2">
              <button class="btn btn-primary btn-sm" id="btn-sc-play">
                ${renderIcon('Play', { size: 14 })}
                <span>Start Replay</span>
              </button>

              <button class="btn btn-sm" id="btn-sc-pause" disabled>
                ${renderIcon('Pause', { size: 14 })}
                <span>Pause</span>
              </button>

              <button class="btn btn-sm btn-subtle" id="btn-sc-reset">
                ${renderIcon('RotateCcw', { size: 14 })}
                <span>Reset</span>
              </button>
            </div>

            <!-- Playback Speed Selector -->
            <div class="flex items-center gap-2">
              <span class="text-secondary text-xs">Replay Speed:</span>
              <button class="btn btn-xs speed-btn active" data-speed="1">1x</button>
              <button class="btn btn-xs speed-btn" data-speed="2">2x</button>
              <button class="btn btn-xs speed-btn" data-speed="5">5x</button>
              <button class="btn btn-xs speed-btn" data-speed="10">10x</button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="margin-top: 14px;">
            <div class="flex items-center justify-between text-xs text-secondary mb-1">
              <span id="sc-progress-label">Ready to execute scenario...</span>
              <span id="sc-progress-pct" class="mono">0%</span>
            </div>
            <div style="width: 100%; height: 6px; background-color: var(--border-color); border-radius: 3px; overflow: hidden;">
              <div id="sc-progress-bar" style="width: 0%; height: 100%; background-color: var(--accent-primary); transition: width 200ms;"></div>
            </div>
          </div>
        </div>

        <!-- Real-Time Replay Event Stream -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Terminal', { size: 16, className: 'text-info' })}
              <span>Live Ingested Telemetry Feed</span>
            </span>
            <span class="badge badge-neutral text-xs" id="sc-stream-count">0 events ingested</span>
          </div>

          <div id="sc-event-stream" class="flex flex-col gap-2" style="max-height: 380px; overflow-y: auto;">
            <div class="text-secondary text-xs p-3">Click "Start Replay" to stream synthetic events into the pipeline.</div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container);
  }

  attachEvents(container) {
    // Scenario card selection
    container.querySelectorAll('[data-sc-id]').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('[data-sc-id]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.activeScenarioId = card.getAttribute('data-sc-id');
        this.engine.stop();
        this.resetUi(container);
      });
    });

    const playBtn = container.querySelector('#btn-sc-play');
    const pauseBtn = container.querySelector('#btn-sc-pause');
    const resetBtn = container.querySelector('#btn-sc-reset');

    const streamMount = container.querySelector('#sc-event-stream');
    const progressBar = container.querySelector('#sc-progress-bar');
    const progressLabel = container.querySelector('#sc-progress-label');
    const progressPct = container.querySelector('#sc-progress-pct');
    const streamCount = container.querySelector('#sc-stream-count');

    playBtn.addEventListener('click', () => {
      if (!this.engine.activeScenario || this.engine.activeScenario.id !== this.activeScenarioId) {
        this.engine.loadScenario(this.activeScenarioId);
        streamMount.innerHTML = '';
      }

      playBtn.disabled = true;
      pauseBtn.disabled = false;

      this.engine.play(
        (step) => {
          progressBar.style.width = `${step.percent}%`;
          progressPct.textContent = `${step.percent}%`;
          progressLabel.textContent = `Streaming event ${step.index} of ${step.total} (${step.event.action})...`;
          streamCount.textContent = `${step.index} events ingested`;

          const eventDiv = document.createElement('div');
          eventDiv.className = 'card';
          eventDiv.style.padding = '8px 12px';
          eventDiv.style.backgroundColor = 'var(--bg-surface-hover)';
          eventDiv.innerHTML = `
            <div class="flex items-center justify-between mb-1">
              <span class="mono text-xs text-info">${escapeHtml(step.event.eventId)}</span>
              ${formatSeverityBadge(step.event.severity)}
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="mono font-semibold">${escapeHtml(step.event.source)} • ${escapeHtml(step.event.action)}</span>
              <span class="mono text-muted">${formatDateTime(step.event.timestamp)}</span>
            </div>
          `;
          streamMount.prepend(eventDiv);
        },
        () => {
          playBtn.disabled = false;
          pauseBtn.disabled = true;
          progressLabel.textContent = 'Scenario playback completed! Threat detection and correlation executed.';
          progressBar.style.width = '100%';
          progressPct.textContent = '100%';
        }
      );
    });

    pauseBtn.addEventListener('click', () => {
      this.engine.pause();
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      progressLabel.textContent = 'Playback paused.';
    });

    resetBtn.addEventListener('click', () => {
      this.engine.stop();
      this.resetUi(container);
    });

    // Speed buttons
    container.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.engine.setSpeed(speed);
      });
    });
  }

  resetUi(container) {
    const playBtn = container.querySelector('#btn-sc-play');
    const pauseBtn = container.querySelector('#btn-sc-pause');
    const progressBar = container.querySelector('#sc-progress-bar');
    const progressLabel = container.querySelector('#sc-progress-label');
    const progressPct = container.querySelector('#sc-progress-pct');
    const streamCount = container.querySelector('#sc-stream-count');
    const streamMount = container.querySelector('#sc-event-stream');

    if (playBtn) playBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    if (progressBar) progressBar.style.width = '0%';
    if (progressPct) progressPct.textContent = '0%';
    if (progressLabel) progressLabel.textContent = 'Ready to execute scenario...';
    if (streamCount) streamCount.textContent = '0 events ingested';
    if (streamMount) streamMount.innerHTML = '<div class="text-secondary text-xs p-3">Click "Start Replay" to stream synthetic events into the pipeline.</div>';
  }

  destroy() {
    this.engine.stop();
  }
}
