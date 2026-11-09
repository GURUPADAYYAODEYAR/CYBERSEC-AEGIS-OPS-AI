import { renderIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/validators.js';
import { formatDateTime } from '../utils/dates.js';
import { formatSeverityBadge } from '../utils/formatting.js';

/**
 * Slide-out Right Detail Drawer.
 */
export class DetailDrawer {
  constructor() {
    this.container = null;
  }

  open({ title = 'Entity Details', subtitle = '', contentHtml = '', actionsHtml = '' }) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'active-drawer-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'detail-drawer';
    drawer.id = 'active-detail-drawer';

    drawer.innerHTML = `
      <div class="drawer-header">
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHtml(title)}</h3>
          ${subtitle ? `<p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <button class="btn btn-subtle btn-xs" id="close-drawer-btn">
          ${renderIcon('X', { size: 16 })}
        </button>
      </div>

      <div class="drawer-body">
        ${contentHtml}
      </div>

      ${actionsHtml ? `<div class="drawer-footer">${actionsHtml}</div>` : ''}
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    const closeHandler = () => this.close();
    overlay.addEventListener('click', closeHandler);
    drawer.querySelector('#close-drawer-btn').addEventListener('click', closeHandler);

    this.container = drawer;
  }

  close() {
    const overlay = document.getElementById('active-drawer-overlay');
    const drawer = document.getElementById('active-detail-drawer');
    if (overlay) overlay.remove();
    if (drawer) drawer.remove();
    this.container = null;
  }

  /**
   * Helper to inspect a Security Event.
   */
  inspectEvent(event) {
    if (!event) return;
    const content = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="mono text-muted text-xs">${event.eventId}</span>
          ${formatSeverityBadge(event.severity)}
        </div>

        <div class="card" style="padding: 10px;">
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; font-size: 12px;">
            <span class="text-secondary">Timestamp:</span>
            <span class="mono">${formatDateTime(event.timestamp)}</span>

            <span class="text-secondary">Source:</span>
            <span><strong>${escapeHtml(event.source)}</strong></span>

            <span class="text-secondary">Event Type:</span>
            <span class="badge badge-neutral">${escapeHtml(event.eventType)}</span>

            <span class="text-secondary">Action:</span>
            <span class="mono text-info">${escapeHtml(event.action)}</span>

            <span class="text-secondary">Outcome:</span>
            <span class="badge ${event.outcome === 'SUCCESS' ? 'badge-success' : event.outcome === 'BLOCKED' ? 'badge-critical' : 'badge-warning'}">${escapeHtml(event.outcome)}</span>

            <span class="text-secondary">User ID:</span>
            <span class="mono text-info">${escapeHtml(event.userId)}</span>

            <span class="text-secondary">Source IP:</span>
            <span class="mono">${escapeHtml(event.sourceIp)}</span>

            <span class="text-secondary">Destination IP:</span>
            <span class="mono">${escapeHtml(event.destinationIp)}</span>

            <span class="text-secondary">Target Resource:</span>
            <span class="mono">${escapeHtml(event.resourceId)}</span>
          </div>
        </div>

        <div>
          <h4 style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary);">RAW PAYLOAD & METADATA</h4>
          <pre class="card mono" style="font-size: 11px; max-height: 240px; overflow-y: auto; padding: 10px; background-color: var(--bg-surface-hover);">${escapeHtml(JSON.stringify(event.metadata || {}, null, 2))}</pre>
        </div>
      </div>
    `;

    this.open({
      title: 'Security Event Inspector',
      subtitle: `${event.source} • ${event.eventType}`,
      contentHtml: content,
      actionsHtml: `<button class="btn btn-primary btn-sm" onclick="window.detailDrawer.close()">Done</button>`
    });
  }
}

// Global instance for convenience
window.detailDrawer = new DetailDrawer();
