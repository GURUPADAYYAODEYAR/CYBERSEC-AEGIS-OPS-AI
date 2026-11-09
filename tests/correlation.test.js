import { describe, it, expect } from 'vitest';
import { CorrelationEngine } from '../src/engine/CorrelationEngine.js';
import { AlertsRepository, IncidentsRepository, EventsRepository } from '../src/storage/repositories.js';

describe('Correlation Engine Tests', () => {
  it('should synthesize multi-stage incidents from related alerts for an entity', async () => {
    // Seed alerts
    await AlertsRepository.addBatch([
      {
        alertId: 'alt-t1',
        ruleId: 'AUTH_001',
        name: 'Excessive Failed Logins',
        severity: 'HIGH',
        source: 'Okta',
        affectedEntity: 'user-schen',
        timestamp: '2026-11-09T08:15:00Z',
        evidenceEventIds: ['evt-1', 'evt-2']
      },
      {
        alertId: 'alt-t2',
        ruleId: 'AUTH_003',
        name: 'Impossible Travel',
        severity: 'CRITICAL',
        source: 'Okta',
        affectedEntity: 'user-schen',
        timestamp: '2026-11-09T08:30:00Z',
        evidenceEventIds: ['evt-3']
      }
    ]);

    await EventsRepository.addBatch([
      { eventId: 'evt-1', userId: 'user-schen', sourceIp: '185.220.101.5' },
      { eventId: 'evt-2', userId: 'user-schen', sourceIp: '185.220.101.5' },
      { eventId: 'evt-3', userId: 'user-schen', sourceIp: '203.0.113.190' }
    ]);

    const result = await CorrelationEngine.correlate();
    expect(result.incidents.length).toBeGreaterThan(0);

    const match = result.incidents.find(i => i.title.includes('user-schen'));
    expect(match).toBeDefined();
    expect(match.severity).toBe('CRITICAL');
    expect(match.entities).toContain('user-schen');
  });
});

