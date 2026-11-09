import { renderIcon } from '../utils/icons.js';
import { formatDateTime } from '../utils/dates.js';
import { formatSeverityBadge } from '../utils/formatting.js';
import { escapeHtml } from '../utils/validators.js';
import { parseCSV, generateCSV, downloadFile } from '../utils/csv.js';
import { EventsRepository } from '../storage/repositories.js';
import { EventNormalizer } from '../engine/EventNormalizer.js';
import { DataTable } from '../components/DataTable.js';

export class EventsPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.dataTable = null;
    this.allEvents = [];
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Security Events Explorer (SentinelOps)</h1>
            <p>High-throughput normalized telemetry from identity providers, cloud trails, endpoints, and AI runtimes.</p>
          </div>
          <div class="page-actions">
            <!-- Hidden File Input for Import -->
            <input type="file" id="event-file-import" accept=".json,.csv" style="display: none;">
            <button class="btn btn-sm" id="btn-trigger-import">
              ${renderIcon('Upload', { size: 14 })}
              <span>Import Logs (JSON/CSV)</span>
            </button>
            <button class="btn btn-sm" id="btn-export-csv">
              ${renderIcon('Download', { size: 14 })}
              <span>Export CSV</span>
            </button>
            <button class="btn btn-sm" id="btn-export-json">
              ${renderIcon('Download', { size: 14 })}
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        <!-- Filter Row -->
        <div class="card" style="padding: 12px;">
          <div class="filter-bar">
            <span class="text-secondary text-xs font-semibold flex items-center gap-1">
              ${renderIcon('Filter', { size: 13 })} Filters:
            </span>

            <select class="select filter-select" id="filter-severity">
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>

            <select class="select filter-select" id="filter-type">
              <option value="">All Event Types</option>
              <option value="AUTHENTICATION">Authentication</option>
              <option value="CLOUD_AUDIT">Cloud Audit</option>
              <option value="ENDPOINT_ACTIVITY">Endpoint Activity</option>
              <option value="AI_AGENT_EXECUTION">AI Agent Execution</option>
              <option value="ADMIN_ACTION">Admin Action</option>
            </select>

            <button class="btn btn-xs btn-subtle" id="btn-clear-filters">Clear Filters</button>
          </div>
        </div>

        <!-- Data Table Container -->
        <div id="events-table-mount"></div>
      </div>
    `;

    this.allEvents = await EventsRepository.getAll();
    this.mountTable(container, this.allEvents);
    this.attachEvents(container);
  }

  mountTable(container, events) {
    const mountPoint = container.querySelector('#events-table-mount');
    if (!mountPoint) return;

    this.dataTable = new DataTable({
      keyField: 'eventId',
      pageSize: 15,
      searchable: true,
      filterPlaceholder: 'Search event ID, user, IP, action, or hostname...',
      columns: [
        {
          field: 'timestamp',
          title: 'Timestamp (UTC)',
          render: (val) => `<span class="mono text-muted">${formatDateTime(val)}</span>`
        },
        {
          field: 'source',
          title: 'Source',
          render: (val) => `<strong>${escapeHtml(val)}</strong>`
        },
        {
          field: 'eventType',
          title: 'Event Type',
          render: (val) => `<span class="badge badge-neutral">${escapeHtml(val)}</span>`
        },
        {
          field: 'action',
          title: 'Action',
          render: (val) => `<span class="mono text-info">${escapeHtml(val)}</span>`
        },
        {
          field: 'outcome',
          title: 'Outcome',
          render: (val) => {
            const cls = val === 'SUCCESS' ? 'badge-success' : val === 'BLOCKED' ? 'badge-critical' : 'badge-warning';
            return `<span class="badge ${cls}">${escapeHtml(val)}</span>`;
          }
        },
        {
          field: 'userId',
          title: 'User / Identity',
          render: (val) => `<span class="mono">${escapeHtml(val)}</span>`
        },
        {
          field: 'sourceIp',
          title: 'Source IP',
          render: (val) => `<span class="mono">${escapeHtml(val)}</span>`
        },
        {
          field: 'severity',
          title: 'Severity',
          render: (val) => formatSeverityBadge(val)
        }
      ],
      data: events,
      onRowClick: (event) => {
        window.detailDrawer.inspectEvent(event);
      }
    });

    mountPoint.innerHTML = '';
    mountPoint.appendChild(this.dataTable.render());
  }

  attachEvents(container) {
    const fileInput = container.querySelector('#event-file-import');
    const triggerBtn = container.querySelector('#btn-trigger-import');

    if (triggerBtn && fileInput) {
      triggerBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          let parsed = [];

          if (file.name.endsWith('.csv')) {
            parsed = parseCSV(text);
          } else {
            parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
              parsed = parsed.events || parsed.data || [parsed];
            }
          }

          const normalized = EventNormalizer.normalizeBatch(parsed);
          if (normalized.length === 0) {
            alert('No valid events could be normalized from the selected file.');
            return;
          }

          await EventsRepository.addBatch(normalized);
          this.allEvents = await EventsRepository.getAll();
          this.dataTable.setData(this.allEvents);
          alert(`Successfully ingested and normalized ${normalized.length} security events.`);
        } catch (err) {
          alert(`Failed to import file: ${err.message}`);
        } finally {
          fileInput.value = '';
        }
      });
    }

    // Export CSV
    const exportCsvBtn = container.querySelector('#btn-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const events = this.dataTable.filteredData;
        const csv = generateCSV(events, ['eventId', 'timestamp', 'source', 'eventType', 'action', 'outcome', 'userId', 'sourceIp', 'destinationIp', 'hostname', 'resourceId', 'severity']);
        downloadFile(csv, `aegis-security-events-${Date.now()}.csv`, 'text/csv');
      });
    }

    // Export JSON
    const exportJsonBtn = container.querySelector('#btn-export-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const json = JSON.stringify(this.dataTable.filteredData, null, 2);
        downloadFile(json, `aegis-security-events-${Date.now()}.json`, 'application/json');
      });
    }

    // Filter Dropdowns
    const sevFilter = container.querySelector('#filter-severity');
    const typeFilter = container.querySelector('#filter-type');
    const clearBtn = container.querySelector('#btn-clear-filters');

    const applyDropdownFilters = () => {
      const sev = sevFilter.value;
      const type = typeFilter.value;

      let filtered = [...this.allEvents];
      if (sev) filtered = filtered.filter(e => e.severity === sev);
      if (type) filtered = filtered.filter(e => e.eventType === type);

      this.dataTable.setData(filtered);
    };

    if (sevFilter) sevFilter.addEventListener('change', applyDropdownFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyDropdownFilters);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        sevFilter.value = '';
        typeFilter.value = '';
        this.dataTable.setData(this.allEvents);
      });
    }
  }

  destroy() {
    this.dataTable = null;
  }
}

