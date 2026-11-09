import { evaluateTravelVelocity } from '../utils/dates.js';

/**
 * Authentication and Identity Detection Rules (AuthWatch Engine).
 * Fully explainable, evidence-backed security algorithms.
 */

export class AuthenticationRules {
  /**
   * Rule AUTH_001: Excessive Failed Login Attempts (Brute Force Indicator).
   */
  static detectFailedLoginBursts(events, threshold = 3, windowMinutes = 10) {
    const alerts = [];
    const authEvents = events.filter(e => e.eventType === 'AUTHENTICATION' && e.action.includes('LOGIN'));

    // Group by (userId, sourceIp)
    const groups = new Map();
    for (const evt of authEvents) {
      const key = `${evt.userId}::${evt.sourceIp}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(evt);
    }

    const windowMs = windowMinutes * 60 * 1000;

    for (const [key, groupEvents] of groups.entries()) {
      // Sort chronologically ascending
      const sorted = [...groupEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Sliding window over failures
      const failures = sorted.filter(e => e.outcome === 'FAILURE');
      for (let i = 0; i < failures.length; i++) {
        const windowStart = new Date(failures[i].timestamp).getTime();
        const windowFailures = [failures[i]];

        for (let j = i + 1; j < failures.length; j++) {
          const t = new Date(failures[j].timestamp).getTime();
          if (t - windowStart <= windowMs) {
            windowFailures.push(failures[j]);
          } else {
            break;
          }
        }

        if (windowFailures.length >= threshold) {
          const [userId, sourceIp] = key.split('::');
          const latest = windowFailures[windowFailures.length - 1];

          alerts.push({
            alertId: `ALT-AUTH-001-${userId}-${latest.eventId}`,
            ruleId: 'AUTH_001',
            name: 'Excessive Failed Login Attempts (Brute Force Indicator)',
            severity: 'HIGH',
            source: latest.source,
            affectedEntity: userId,
            evidenceEventIds: windowFailures.map(e => e.eventId),
            timestamp: latest.timestamp,
            explanation: `Observed ${windowFailures.length} failed login attempts for account "${userId}" from source IP ${sourceIp} within ${windowMinutes} minutes. Potential password spraying or brute force attack in progress.`
          });

          // Fast-forward outer loop to avoid spamming alerts for the same burst
          i += windowFailures.length - 1;
        }
      }
    }

    return alerts;
  }

  /**
   * Rule AUTH_002: Successful Authentication Following Multiple Failures.
   */
  static detectSuccessAfterFailures(events, windowMinutes = 15) {
    const alerts = [];
    const authEvents = events.filter(e => e.eventType === 'AUTHENTICATION');

    const byUser = new Map();
    for (const evt of authEvents) {
      if (!byUser.has(evt.userId)) byUser.set(evt.userId, []);
      byUser.get(evt.userId).push(evt);
    }

    const windowMs = windowMinutes * 60 * 1000;

    for (const [userId, userEvents] of byUser.entries()) {
      const sorted = [...userEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].outcome === 'SUCCESS') {
          const successTime = new Date(sorted[i].timestamp).getTime();

          // Look backward for failures within window
          const priorFailures = [];
          for (let j = i - 1; j >= 0; j--) {
            const failTime = new Date(sorted[j].timestamp).getTime();
            if (successTime - failTime <= windowMs && sorted[j].outcome === 'FAILURE') {
              priorFailures.push(sorted[j]);
            } else if (successTime - failTime > windowMs) {
              break;
            }
          }

          if (priorFailures.length >= 2) {
            alerts.push({
              alertId: `ALT-AUTH-002-${userId}-${sorted[i].eventId}`,
              ruleId: 'AUTH_002',
              name: 'Successful Authentication Following Multiple Failures',
              severity: 'CRITICAL',
              source: sorted[i].source,
              affectedEntity: userId,
              evidenceEventIds: [...priorFailures.map(f => f.eventId), sorted[i].eventId],
              timestamp: sorted[i].timestamp,
              explanation: `Account "${userId}" successfully authenticated at ${sorted[i].timestamp} immediately following ${priorFailures.length} failed authentication attempts within ${windowMinutes} minutes. High risk of compromised credentials.`
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Rule AUTH_003: Impossible Travel Velocity Anomaly.
   */
  static detectImpossibleTravel(events, identities, speedThresholdKmh = 900) {
    const alerts = [];
    const successLogins = events.filter(e => e.eventType === 'AUTHENTICATION' && e.outcome === 'SUCCESS');

    const byUser = new Map();
    for (const evt of successLogins) {
      if (!byUser.has(evt.userId)) byUser.set(evt.userId, []);
      byUser.get(evt.userId).push(evt);
    }

    for (const [userId, userEvents] of byUser.entries()) {
      const sorted = [...userEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      for (let i = 0; i < sorted.length - 1; i++) {
        const e1 = sorted[i];
        const e2 = sorted[i + 1];

        const geo1 = e1.metadata?.geo;
        const geo2 = e2.metadata?.geo;

        if (geo1 && geo2 && geo1.lat !== undefined && geo2.lat !== undefined) {
          const evalResult = evaluateTravelVelocity(geo1, e1.timestamp, geo2.timestamp, e2.timestamp, speedThresholdKmh);

          if (evalResult && evalResult.isImpossibleTravel) {
            alerts.push({
              alertId: `ALT-AUTH-003-${userId}-${e2.eventId}`,
              ruleId: 'AUTH_003',
              name: 'Impossible Travel Velocity Anomaly',
              severity: 'CRITICAL',
              source: e2.source,
              affectedEntity: userId,
              evidenceEventIds: [e1.eventId, e2.eventId],
              timestamp: e2.timestamp,
              explanation: `Logins for "${userId}" occurred between ${geo1.city || 'Location 1'} (${geo1.country || '?'}) and ${geo2.city || 'Location 2'} (${geo2.country || '?'}) spanning ${evalResult.distanceKm} km in ${evalResult.elapsedHours} hours (implied speed: ${evalResult.speedKmh} km/h, threshold: ${speedThresholdKmh} km/h). Note: This heuristic indicates either credential sharing or proxy/VPN usage.`
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Rule AUTH_004: Unseen Device Identifier Authentication.
   */
  static detectUnseenDevices(events, identities) {
    const alerts = [];
    const idMap = new Map((identities || []).map(id => [id.userId, id]));

    const logins = events.filter(e => e.eventType === 'AUTHENTICATION' && e.outcome === 'SUCCESS');

    for (const evt of logins) {
      const identity = idMap.get(evt.userId);
      const deviceId = evt.metadata?.deviceId;

      if (identity && deviceId && Array.isArray(identity.knownDevices)) {
        if (!identity.knownDevices.includes(deviceId)) {
          alerts.push({
            alertId: `ALT-AUTH-004-${evt.userId}-${evt.eventId}`,
            ruleId: 'AUTH_004',
            name: 'Unseen Device Identifier Authentication',
            severity: 'MEDIUM',
            source: evt.source,
            affectedEntity: evt.userId,
            evidenceEventIds: [evt.eventId],
            timestamp: evt.timestamp,
            explanation: `Account "${evt.userId}" successfully logged in using an unrecognized device footprint: "${deviceId}". Known authorized devices: [${identity.knownDevices.join(', ')}].`
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Rule AUTH_005: Unexpected Privilege Escalation.
   */
  static detectUnexpectedPrivilegeChanges(events) {
    const alerts = [];
    const privEvents = events.filter(e => 
      (e.eventType === 'CLOUD_AUDIT' || e.eventType === 'ADMIN_ACTION') &&
      (e.action.includes('RolePolicy') || e.action.includes('GrantAdmin') || e.action.includes('AttachPolicy') || e.action.includes('RoleElevation'))
    );

    for (const evt of privEvents) {
      const addedPerms = evt.metadata?.addedPermissions || [];
      const isWildcard = addedPerms.includes('*') || JSON.stringify(evt.metadata).includes('"*"');

      if (isWildcard || evt.severity === 'HIGH' || evt.severity === 'CRITICAL') {
        alerts.push({
          alertId: `ALT-AUTH-005-${evt.userId}-${evt.eventId}`,
          ruleId: 'AUTH_005',
          name: 'Unexpected Administrative Privilege Escalation',
          severity: 'HIGH',
          source: evt.source,
          affectedEntity: evt.resourceId || evt.userId,
          evidenceEventIds: [evt.eventId],
          timestamp: evt.timestamp,
          explanation: `Actor "${evt.userId}" executed high-privilege configuration modification (${evt.action}) granting unrestricted permissions (*) to resource "${evt.resourceId}".`
        });
      }
    }

    return alerts;
  }
}
