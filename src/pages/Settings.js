import { renderIcon } from '../utils/icons.js';
import { DataStoreManager, EventsRepository, IdentitiesRepository, CloudResourcesRepository, AlertsRepository, IncidentsRepository } from '../storage/repositories.js';
import { downloadFile } from '../utils/csv.js';

export class SettingsPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Settings & Data Management</h1>
            <p>IndexedDB local storage management, system state import/export, and demonstration environment resets.</p>
          </div>
        </div>

        <!-- Storage Status Grid -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Database', { size: 16, className: 'text-info' })}
              <span>Browser Storage Telemetry (IndexedDB: AegisOpsDB)</span>
            </span>
            <span class="badge badge-success">Client-Side Persistent</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;" id="storage-stats-grid">
            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs">Security Events</span>
              <div class="font-bold text-lg mt-1" id="stat-events">—</div>
            </div>
            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs">Identities</span>
              <div class="font-bold text-lg mt-1" id="stat-identities">—</div>
            </div>
            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs">Cloud Resources</span>
              <div class="font-bold text-lg mt-1" id="stat-cloud">—</div>
            </div>
            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs">Active Alerts</span>
              <div class="font-bold text-lg mt-1" id="stat-alerts">—</div>
            </div>
            <div class="card" style="padding: 10px; background-color: var(--bg-surface-hover);">
              <span class="text-secondary text-xs">Incidents</span>
              <div class="font-bold text-lg mt-1" id="stat-incidents">—</div>
            </div>
          </div>
        </div>

        <!-- System State Export & Import -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Download', { size: 16, className: 'text-warning' })}
              <span>System State Backup & Restoration</span>
            </span>
          </div>

          <div class="flex items-center gap-3" style="flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" id="btn-export-full-db">
              ${renderIcon('Download', { size: 14 })}
              <span>Export Full Database (JSON)</span>
            </button>

            <input type="file" id="db-import-file" accept=".json" style="display: none;">
            <button class="btn btn-sm" id="btn-trigger-import-db">
              ${renderIcon('Upload', { size: 14 })}
              <span>Import Saved Database</span>
            </button>
          </div>
          <p class="text-muted text-xs mt-2">
            Allows saving the entire state of events, incidents, notes, and cloud resources to a portable JSON file.
          </p>
        </div>

        <!-- Danger Zone / Demo Reset -->
        <div class="card" style="border-left: 3px solid var(--status-critical);">
          <div class="card-header">
            <span class="card-title text-critical">
              ${renderIcon('RotateCcw', { size: 16, className: 'text-critical' })}
              <span>Demonstration Reset & Cleanup</span>
            </span>
          </div>

          <div class="flex items-center gap-3" style="flex-wrap: wrap;">
            <button class="btn btn-critical btn-sm" id="btn-factory-reset">
              ${renderIcon('RotateCcw', { size: 14 })}
              <span>Reset to Demo Defaults</span>
            </button>

            <button class="btn btn-sm" id="btn-clear-events-only">
              ${renderIcon('Trash2', { size: 14 })}
              <span>Clear Ingested Events Only</span>
            </button>
          </div>
          <p class="text-muted text-xs mt-2">
            Wipes local IndexedDB collections and restores initial synthetic baseline data for presentation demonstrations.
          </p>
        </div>

        <!-- Platform Architecture & Security Boundaries -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${renderIcon('Shield', { size: 16, className: 'text-info' })}
              <span>Architecture & Privacy Assurance</span>
            </span>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;">
            <strong>Zero-Backend Operation:</strong> AEGIS OPS AI runs 100% inside the client browser. No telemetry or imported logs are transmitted to external cloud servers, third-party analytics endpoints, or remote databases.
            All graph calculations, Z-score standard deviations, and policy evaluations execute locally via Web APIs.
          </p>
        </div>
      </div>
    `;

    await this.loadStats(container);
    this.attachEvents(container);
  }

  async loadStats(container) {
    const [events, identities, cloud, alerts, incidents] = await Promise.all([
      EventsRepository.count(),
      IdentitiesRepository.getAll(),
      CloudResourcesRepository.getAll(),
      AlertsRepository.getAll(),
      IncidentsRepository.getAll()
    ]);

    const sEvents = container.querySelector('#stat-events');
    const sId = container.querySelector('#stat-identities');
    const sCloud = container.querySelector('#stat-cloud');
    const sAlerts = container.querySelector('#stat-alerts');
    const sInc = container.querySelector('#stat-incidents');

    if (sEvents) sEvents.textContent = events;
    if (sId) sId.textContent = identities.length;
    if (sCloud) sCloud.textContent = cloud.length;
    if (sAlerts) sAlerts.textContent = alerts.length;
    if (sInc) sInc.textContent = incidents.length;
  }

  attachEvents(container) {
    const exportBtn = container.querySelector('#btn-export-full-db');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const json = await DataStoreManager.exportFullDatabaseAsJson();
        downloadFile(json, `aegis-ops-ai-backup-${Date.now()}.json`, 'application/json');
      });
    }

    const importBtn = container.querySelector('#btn-trigger-import-db');
    const fileInput = container.querySelector('#db-import-file');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          await DataStoreManager.importDatabaseFromJson(text);
          alert('Database restored successfully from backup.');
          await this.loadStats(container);
        } catch (err) {
          alert(`Failed to import database: ${err.message}`);
        } finally {
          fileInput.value = '';
        }
      });
    }

    const resetBtn = container.querySelector('#btn-factory-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Reset AEGIS OPS AI database to initial factory defaults?')) {
          await DataStoreManager.resetToDemoDefaults();
          await this.loadStats(container);
          alert('System state reset to factory defaults.');
        }
      });
    }

    const clearEventsBtn = container.querySelector('#btn-clear-events-only');
    if (clearEventsBtn) {
      clearEventsBtn.addEventListener('click', async () => {
        if (confirm('Clear all security events from storage?')) {
          await EventsRepository.clear();
          await this.loadStats(container);
          alert('Security events cleared.');
        }
      });
    }
  }

  destroy() {}
}
