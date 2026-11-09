import { describe, it, expect } from 'vitest';
import { AuthenticationRules } from '../src/detection/AuthenticationRules.js';
import { StatisticalDetector } from '../src/detection/StatisticalDetector.js';

describe('Threat Detection Rules Tests', () => {
  it('should detect excessive failed login attempts (AUTH_001)', () => {
    const events = [
      {
        eventId: 'f1',
        timestamp: '2026-11-09T08:00:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_ATTEMPT',
        outcome: 'FAILURE',
        userId: 'user-schen',
        sourceIp: '185.220.101.5',
        source: 'Okta'
      },
      {
        eventId: 'f2',
        timestamp: '2026-11-09T08:02:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_ATTEMPT',
        outcome: 'FAILURE',
        userId: 'user-schen',
        sourceIp: '185.220.101.5',
        source: 'Okta'
      },
      {
        eventId: 'f3',
        timestamp: '2026-11-09T08:04:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_ATTEMPT',
        outcome: 'FAILURE',
        userId: 'user-schen',
        sourceIp: '185.220.101.5',
        source: 'Okta'
      }
    ];

    const alerts = AuthenticationRules.detectFailedLoginBursts(events, 3, 10);
    expect(alerts.length).toBe(1);
    expect(alerts[0].ruleId).toBe('AUTH_001');
    expect(alerts[0].affectedEntity).toBe('user-schen');
    expect(alerts[0].evidenceEventIds).toEqual(['f1', 'f2', 'f3']);
  });

  it('should detect success after failures (AUTH_002)', () => {
    const events = [
      {
        eventId: 'f1',
        timestamp: '2026-11-09T08:00:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_ATTEMPT',
        outcome: 'FAILURE',
        userId: 'user-schen',
        source: 'Okta'
      },
      {
        eventId: 'f2',
        timestamp: '2026-11-09T08:02:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_ATTEMPT',
        outcome: 'FAILURE',
        userId: 'user-schen',
        source: 'Okta'
      },
      {
        eventId: 's1',
        timestamp: '2026-11-09T08:05:00Z',
        eventType: 'AUTHENTICATION',
        action: 'USER_LOGIN_SUCCESS',
        outcome: 'SUCCESS',
        userId: 'user-schen',
        source: 'Okta'
      }
    ];

    const alerts = AuthenticationRules.detectSuccessAfterFailures(events, 15);
    expect(alerts.length).toBe(1);
    expect(alerts[0].ruleId).toBe('AUTH_002');
    expect(alerts[0].severity).toBe('CRITICAL');
  });

  it('should detect volume anomaly via Statistical Z-Score (STAT_001)', () => {
    // 3 baseline hours with 2 events each, and 1 surge hour with 50 events
    const events = [];
    for (let i = 0; i < 2; i++) {
      events.push({ eventId: `b1-${i}`, timestamp: '2026-11-09T01:10:00Z' });
      events.push({ eventId: `b2-${i}`, timestamp: '2026-11-09T02:10:00Z' });
      events.push({ eventId: `b3-${i}`, timestamp: '2026-11-09T03:10:00Z' });
    }
    for (let i = 0; i < 40; i++) {
      events.push({ eventId: `surge-${i}`, timestamp: '2026-11-09T04:10:00Z' });
    }

    const alerts = StatisticalDetector.detectVolumeAnomalies(events, 1.5);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].ruleId).toBe('STAT_001');
  });
});
