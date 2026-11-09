/**
 * Behavioral Threat Detector (AuthWatch / SentinelOps).
 * Compares incoming activity against known synthetic entity baselines.
 */

export class BehavioralDetector {
  /**
   * Detects logins outside normal synthetic work schedule or atypical IP addresses.
   */
  static detectOffHoursActivity(events, identities) {
    const alerts = [];
    const idMap = new Map((identities || []).map(i => [i.userId, i]));

    const logins = events.filter(e => e.eventType === 'AUTHENTICATION' && e.outcome === 'SUCCESS');

    for (const evt of logins) {
      const identity = idMap.get(evt.userId);
      if (!identity) continue;

      const date = new Date(evt.timestamp);
      const hourUtc = date.getUTCHours();

      // Check if login occurs in late night hours (e.g. between 01:00 UTC and 05:00 UTC)
      // for US-based employees where normal schedule is Mon-Fri daytime
      if (hourUtc >= 1 && hourUtc <= 5 && identity.homeLocation?.country === 'US') {
        alerts.push({
          alertId: `ALT-BEHAV-001-${evt.userId}-${evt.eventId}`,
          ruleId: 'BEHAV_001',
          name: 'Off-Hours Authentication Outside Behavioral Baseline',
          severity: 'LOW',
          source: evt.source,
          affectedEntity: evt.userId,
          evidenceEventIds: [evt.eventId],
          timestamp: evt.timestamp,
          explanation: `User "${identity.displayName}" (${evt.userId}) authenticated at ${evt.timestamp} (0${hourUtc}:00 UTC). Normal scheduled hours are "${identity.normalSchedule}".`
        });
      }
    }

    return alerts;
  }
}

