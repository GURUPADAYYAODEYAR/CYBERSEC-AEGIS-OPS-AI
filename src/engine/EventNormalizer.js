/**
 * Unified Event Normalization Engine.
 * Converts heterogeneous logs (Auth, Cloud, Endpoint, Network, AI Agent) into standard schema.
 */

export class EventNormalizer {
  /**
   * Normalize an incoming raw record (JSON or CSV parsed object).
   */
  static normalize(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid event record: must be a non-null object');
    }

    const eventId = raw.eventId || raw.id || raw.event_id || `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Timestamp validation & normalization
    let timestamp = raw.timestamp || raw.time || raw['@timestamp'] || raw.datetime || new Date().toISOString();
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) {
      timestamp = new Date().toISOString();
    } else {
      timestamp = parsedDate.toISOString();
    }

    const source = String(raw.source || raw.logSource || raw.service || raw.vendor || 'Generic_Log').trim();

    // Map Event Type
    const rawType = String(raw.eventType || raw.type || raw.category || '').toUpperCase();
    let eventType = 'SECURITY_AUDIT';
    if (rawType.includes('AUTH') || rawType.includes('LOGIN') || rawType.includes('SIGNIN')) {
      eventType = 'AUTHENTICATION';
    } else if (rawType.includes('CLOUD') || rawType.includes('AWS') || rawType.includes('AZURE') || rawType.includes('GCP')) {
      eventType = 'CLOUD_AUDIT';
    } else if (rawType.includes('ENDPOINT') || rawType.includes('PROCESS') || rawType.includes('EDR')) {
      eventType = 'ENDPOINT_ACTIVITY';
    } else if (rawType.includes('NET') || rawType.includes('FIREWALL') || rawType.includes('FLOW')) {
      eventType = 'NETWORK_FLOW';
    } else if (rawType.includes('AGENT') || rawType.includes('AI') || rawType.includes('LLM')) {
      eventType = 'AI_AGENT_EXECUTION';
    } else if (rawType.includes('ADMIN') || rawType.includes('IAM') || rawType.includes('CONFIG')) {
      eventType = 'ADMIN_ACTION';
    }

    // Map Action
    const action = String(raw.action || raw.eventName || raw.operation || raw.activity || 'UNKNOWN_ACTION').trim();

    // Map Outcome
    const rawOutcome = String(raw.outcome || raw.status || raw.result || '').toUpperCase();
    let outcome = 'UNKNOWN';
    if (rawOutcome.includes('SUCC') || rawOutcome === 'OK' || rawOutcome === 'ALLOW') outcome = 'SUCCESS';
    else if (rawOutcome.includes('FAIL') || rawOutcome.includes('DENIED') || rawOutcome === 'REJECT') outcome = 'FAILURE';
    else if (rawOutcome.includes('BLOCK')) outcome = 'BLOCKED';
    else if (rawOutcome.includes('ERR')) outcome = 'ERROR';

    // Entities & Technical Attributes
    const userId = raw.userId || raw.user || raw.username || raw.account_id || raw.identity || 'system';
    const sourceIp = raw.sourceIp || raw.src_ip || raw.ip || raw.client_ip || '127.0.0.1';
    const destinationIp = raw.destinationIp || raw.dst_ip || raw.dest_ip || '10.0.0.1';
    const hostname = raw.hostname || raw.host || raw.machine || raw.node || 'host-gateway';
    const resourceId = raw.resourceId || raw.resource || raw.target || raw.target_resource || 'res-generic';

    // Severity Normalization
    const rawSev = String(raw.severity || raw.level || raw.priority || 'INFO').toUpperCase();
    let severity = 'INFO';
    if (rawSev === 'CRITICAL' || rawSev === 'FATAL') severity = 'CRITICAL';
    else if (rawSev === 'HIGH' || rawSev === 'ERROR') severity = 'HIGH';
    else if (rawSev === 'MEDIUM' || rawSev === 'WARN' || rawSev === 'WARNING') severity = 'MEDIUM';
    else if (rawSev === 'LOW') severity = 'LOW';

    // Metadata preservation
    const metadata = raw.metadata || {};
    // Capture remaining top-level custom properties into metadata
    for (const key of Object.keys(raw)) {
      if (!['eventId', 'timestamp', 'source', 'eventType', 'action', 'outcome', 'userId', 'sourceIp', 'destinationIp', 'hostname', 'resourceId', 'severity', 'metadata'].includes(key)) {
        metadata[key] = raw[key];
      }
    }

    return {
      eventId,
      timestamp,
      source,
      eventType,
      action,
      outcome,
      userId,
      sourceIp,
      destinationIp,
      hostname,
      resourceId,
      severity,
      metadata
    };
  }

  /**
   * Batch normalize records.
   */
  static normalizeBatch(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(item => {
      try {
        return this.normalize(item);
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
  }
}
