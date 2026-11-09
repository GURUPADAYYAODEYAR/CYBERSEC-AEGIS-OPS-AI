import { describe, it, expect } from 'vitest';
import { CloudRules } from '../src/detection/CloudRules.js';

describe('CloudFence Posture Assessment Tests', () => {
  it('should flag publicly accessible S3 storage buckets (CLOUD_001)', () => {
    const resources = [
      {
        resourceId: 's3-leak',
        resourceName: 'public-vault',
        resourceType: 'S3_BUCKET',
        isPublic: true
      }
    ];

    const findings = CloudRules.evaluateCloudPosture(resources);
    expect(findings.length).toBe(1);
    expect(findings[0].policyId).toBe('CLOUD_001');
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('should flag open administrative ports 22 and 3389 to 0.0.0.0/0 (CLOUD_002)', () => {
    const resources = [
      {
        resourceId: 'sg-unsafe',
        resourceName: 'unsafe-sg',
        resourceType: 'SECURITY_GROUP',
        ingressRules: [
          { port: 22, source: '0.0.0.0/0', isRisky: true }
        ]
      }
    ];

    const findings = CloudRules.evaluateCloudPosture(resources);
    expect(findings.length).toBe(1);
    expect(findings[0].policyId).toBe('CLOUD_002');
    expect(findings[0].severity).toBe('HIGH');
  });

  it('should flag unencrypted RDS instances (CLOUD_004)', () => {
    const resources = [
      {
        resourceId: 'rds-unenc',
        resourceName: 'customer-db',
        resourceType: 'RDS_DATABASE',
        encrypted: false
      }
    ];

    const findings = CloudRules.evaluateCloudPosture(resources);
    expect(findings.length).toBe(1);
    expect(findings[0].policyId).toBe('CLOUD_004');
  });
});

