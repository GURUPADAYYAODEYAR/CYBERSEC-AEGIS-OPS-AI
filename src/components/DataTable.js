import { renderIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/validators.js';

/**
 * Reusable Data Table Component.
 */
export class DataTable {
  constructor({
    columns = [],
    data = [],
    keyField = 'id',
    pageSize = 15,
    onRowClick = null,
    searchable = true,
    filterPlaceholder = 'Filter records...'
  }) {
    this.columns = columns;
    this.rawData = data;
    this.filteredData = [...data];
    this.keyField = keyField;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.onRowClick = onRowClick;
    this.searchable = searchable;
    this.filterPlaceholder = filterPlaceholder;
    this.searchTerm = '';
    this.container = null;
  }

  setData(newData) {
    this.rawData = newData || [];
    this.applyFilters();
  }

  applyFilters() {
    if (!this.searchTerm) {
      this.filteredData = [...this.rawData];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredData = this.rawData.filter(row => {
        return Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(term);
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    // Sort if active
    if (this.sortColumn) {
      this.filteredData.sort((a, b) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
          return this.sortDirection === 'asc'
            ? valA.localeCompare(String(valB))
            : String(valB).localeCompare(valA);
        }
        return this.sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    this.currentPage = 1;
    this.updateDom();
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    this.container = wrapper;
    this.updateDom();
    return wrapper;
  }

  updateDom() {
    if (!this.container) return;

    const totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageRows = this.filteredData.slice(startIdx, startIdx + this.pageSize);

    // Header HTML
    const headersHtml = this.columns.map(col => {
      const isSorted = this.sortColumn === col.field;
      const arrow = isSorted ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
      return `<th class="sortable" data-field="${col.field}">${escapeHtml(col.title)}${arrow}</th>`;
    }).join('');

    // Rows HTML
    let bodyHtml = '';
    if (pageRows.length === 0) {
      bodyHtml = `
        <tr>
          <td colspan="${this.columns.length}" style="text-align: center; padding: 32px; color: var(--text-muted);">
            No matching records found.
          </td>
        </tr>
      `;
    } else {
      bodyHtml = pageRows.map(row => {
        const cells = this.columns.map(col => {
          if (col.render) {
            return `<td>${col.render(row[col.field], row)}</td>`;
          }
          const val = row[col.field];
          return `<td>${val !== undefined && val !== null ? escapeHtml(String(val)) : '—'}</td>`;
        }).join('');

        const rowKey = row[this.keyField] || Math.random();
        return `<tr data-row-key="${escapeHtml(String(rowKey))}">${cells}</tr>`;
      }).join('');
    }

    this.container.innerHTML = `
      ${this.searchable ? `
        <div class="table-toolbar">
          <div style="position: relative; max-width: 280px; width: 100%;">
            <input type="text" class="input table-search" placeholder="${escapeHtml(this.filterPlaceholder)}" value="${escapeHtml(this.searchTerm)}">
          </div>
          <div class="text-secondary text-xs">
            Showing <strong>${this.filteredData.length}</strong> total records
          </div>
        </div>
      ` : ''}

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <div>Page ${this.currentPage} of ${totalPages} (${this.filteredData.length} items)</div>
        <div class="pagination-controls">
          <button class="btn btn-xs btn-prev" ${this.currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <button class="btn btn-xs btn-next" ${this.currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    // Attach Event Listeners
    const searchInput = this.container.querySelector('.table-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim();
        this.applyFilters();
      });
    }

    const sortableHeaders = this.container.querySelectorAll('th.sortable');
    sortableHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-field');
        if (this.sortColumn === field) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = field;
          this.sortDirection = 'asc';
        }
        this.applyFilters();
      });
    });

    const rows = this.container.querySelectorAll('tbody tr');
    rows.forEach((tr, idx) => {
      tr.addEventListener('click', () => {
        if (pageRows[idx] && this.onRowClick) {
          this.onRowClick(pageRows[idx]);
        }
      });
    });

    const prevBtn = this.container.querySelector('.btn-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.updateDom();
        }
      });
    }

    const nextBtn = this.container.querySelector('.btn-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.updateDom();
        }
      });
    }
  }
}
