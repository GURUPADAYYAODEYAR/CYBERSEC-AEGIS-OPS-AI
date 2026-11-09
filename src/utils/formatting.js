import { escapeHtml } from './validators.js';

/**
 * Utility formatters for UI representation.
 */

export function formatSeverityBadge(severity) {
  const s = String(severity || 'INFO').toUpperCase();
  let badgeClass = 'badge-info';
  if (s === 'CRITICAL') badgeClass = 'badge-critical';
  else if (s === 'HIGH') badgeClass = 'badge-high';
  else if (s === 'MEDIUM') badgeClass = 'badge-medium';
  else if (s === 'LOW') badgeClass = 'badge-low';
  else if (s === 'SUCCESS') badgeClass = 'badge-success';

  return `<span class="badge ${badgeClass}">${escapeHtml(s)}</span>`;
}

export function formatStatusBadge(status) {
  const st = String(status || 'OPEN').toUpperCase();
  let badgeClass = 'badge-neutral';
  if (st === 'OPEN') badgeClass = 'badge-critical';
  else if (st === 'INVESTIGATING') badgeClass = 'badge-medium';
  else if (st === 'CONTAINED' || st === 'CONTAINED (SIMULATED)') badgeClass = 'badge-low';
  else if (st === 'RESOLVED' || st === 'CLOSED') badgeClass = 'badge-success';

  return `<span class="badge ${badgeClass}">${escapeHtml(st)}</span>`;
}

export function formatRiskScore(score) {
  const num = Math.min(100, Math.max(0, Math.round(Number(score) || 0)));
  let colorClass = 'text-success';
  if (num >= 80) colorClass = 'text-critical';
  else if (num >= 50) colorClass = 'text-warning';
  else if (num >= 20) colorClass = 'text-info';

  return `<span class="mono font-semibold ${colorClass}">${num}/100</span>`;
}

export function truncate(text, maxLen = 45) {
  if (!text) return '—';
  const str = String(text);
  if (str.length <= maxLen) return escapeHtml(str);
  return escapeHtml(str.substring(0, maxLen)) + '…';
}

export function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

