import { describe, it, expect } from 'vitest';
import { EventNormalizer } from '../src/engine/EventNormalizer.js';
import { parseCSV, generateCSV } from '../src/utils/csv.js';

describe('EventNormalizer & CSV Parsing Tests', () => {
  it('should normalize a valid raw JSON event', () => {
    const raw = {
      id: 'custom-123',
      time: '2026-11-09T10:00:00Z',
      service: 'Okta_IdP',
      type: 'user_login',
      status: 'SUCCESS',
      username: 'user-schen',
      src_ip: '198.51.100.45'
    };

    const norm = EventNormalizer.normalize(raw);
    expect(norm.eventId).toBe('custom-123');
    expect(norm.timestamp).toBe('2026-11-09T10:00:00.000Z');
    expect(norm.source).toBe('Okta_IdP');
    expect(norm.eventType).toBe('AUTHENTICATION');
    expect(norm.outcome).toBe('SUCCESS');
    expect(norm.userId).toBe('user-schen');
    expect(norm.sourceIp).toBe('198.51.100.45');
  });

  it('should handle malformed timestamp gracefully', () => {
    const raw = {
      timestamp: 'INVALID_TIMESTAMP_STRING',
      action: 'TEST_ACTION'
    };

    const norm = EventNormalizer.normalize(raw);
    expect(norm.timestamp).toBeDefined();
    expect(isNaN(new Date(norm.timestamp).getTime())).toBe(false);
  });

  it('should correctly parse CSV strings and account for quotes', () => {
    const csv = `eventId,timestamp,source,eventType,action,outcome\n"evt-01","2026-11-09T08:00:00Z","Okta","AUTHENTICATION","LOGIN","SUCCESS"\n"evt-02","2026-11-09T08:01:00Z","AWS","CLOUD_AUDIT","AssumeRole","SUCCESS"`;
    const parsed = parseCSV(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].eventId).toBe('evt-01');
    expect(parsed[0].source).toBe('Okta');
    expect(parsed[1].eventType).toBe('CLOUD_AUDIT');
  });

  it('should generate CSV matching the schema', () => {
    const data = [{ eventId: 'e-1', action: 'LOGIN, SUCCESS' }];
    const output = generateCSV(data);
    expect(output).toContain('"LOGIN, SUCCESS"');
  });
});

