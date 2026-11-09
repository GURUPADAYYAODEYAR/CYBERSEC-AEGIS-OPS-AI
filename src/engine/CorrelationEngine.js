import { AlertsRepository, IncidentsRepository, EventsRepository } from '../storage/repositories.js';

/**
 * Event & Alert Correlation Engine.
 * Synthesizes multi-stage incident investigations from cross-module alerts.
 */
export class CorrelationEngine {
  /**
   * Correlates existing alerts into incidents.
   */
  static async correlate() {
    const [alerts, existingIncidents, events] = await Promise.all([
      AlertsRepository.getAll(),
      IncidentsRepository.getAll(),
      EventsRepository.getAll()
    ]);

    if (alerts.length === 0) {
      return { incidentsCreated: 0, incidents: existingIncidents };
    }

    const createdIncidents = [];
    const existingTitles = new Set(existingIncidents.map(i => i.title));

    // Group alerts by affected user / entity
    const userGroups = new Map();
    for (const alert of alerts) {
      const entity = alert.affectedEntity;
      if (!userGroups.has(entity)) userGroups.set(entity, []);
      userGroups.get(entity).push(alert);
    }

    // Correlate multi-stage activity for high risk users (e.g. user-schen)
    for (const [entityId, groupAlerts] of userGroups.entries()) {
      if (groupAlerts.length >= 2) {
        // Multi-alert entity detected
        const hasAuthAlert = groupAlerts.some(a => a.ruleId.startsWith('AUTH_'));
        const hasCritical = groupAlerts.some(a => a.severity === 'CRITICAL');
        const hasCloudOrAgent = alerts.some(a => a.ruleId.startsWith('CLOUD_') || a.ruleId.startsWith('AGENT_'));

        const title = `Multi-Stage Threat Investigation: Correlated Anomalies on ${entityId}`;

        if (!existingTitles.has(title)) {
          // Gather evidence events
          const evidenceEventIds = new Set();
          groupAlerts.forEach(a => (a.evidenceEventIds || []).forEach(id => evidenceEventIds.add(id)));

          // Find connected IP addresses and resources from related events
          const relatedEvents = events.filter(e => e.userId === entityId || evidenceEventIds.has(e.eventId));
          const entities = new Set([entityId]);
          relatedEvents.forEach(e => {
            if (e.sourceIp) entities.add(e.sourceIp);
            if (e.resourceId) entities.add(e.resourceId);
          });

          const incident = {
            incidentId: `INC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`,
            title,
            severity: hasCritical ? 'CRITICAL' : 'HIGH',
            status: 'OPEN',
            assignedAnalyst: 'Alex Rivera (SecOps Lead)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            entities: Array.from(entities),
            triggeringAlerts: groupAlerts.map(a => a.alertId),
            evidenceEventIds: Array.from(evidenceEventIds),
            summary: `Automated correlation detected ${groupAlerts.length} correlated security alerts linked to entity "${entityId}". Pattern indicates multi-stage progression spanning authentication anomalies, behavioral deviations, and sensitive infrastructure interactions.`
          };

          await IncidentsRepository.save(incident);
          await IncidentsRepository.addNote(
            incident.incidentId,
            'System Correlation Engine',
            `Correlated ${groupAlerts.length} alerts for entity "${entityId}". Triage priority: ${incident.severity}.`
          );

          createdIncidents.push(incident);
          existingTitles.add(title);
        }
      }
    }

    const allIncidents = await IncidentsRepository.getAll();
    return {
      incidentsCreated: createdIncidents.length,
      incidents: allIncidents
    };
  }
}
