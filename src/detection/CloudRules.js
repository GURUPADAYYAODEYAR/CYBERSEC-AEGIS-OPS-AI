/**
 * Cloud Security Posture Rules (CloudFence Engine).
 * Offline assessment of fictional cloud infrastructure resources.
 */

export class CloudRules {
  /**
   * Run all cloud posture checks against an inventory of synthetic resources.
   */
  static evaluateCloudPosture(resources = []) {
    const findings = [];

    for (const res of resources) {
      // Rule CLOUD_001: Publicly Accessible Object Storage
      if (res.resourceType === 'S3_BUCKET' && (res.isPublic === true || res.policyRules?.acl?.includes('public'))) {
        findings.push({
          findingId: `FIND-CLOUD-001-${res.resourceId}`,
          resourceId: res.resourceId,
          resourceName: res.resourceName || res.resourceId,
          resourceType: res.resourceType,
          policyId: 'CLOUD_001',
          title: 'Publicly Accessible Cloud Storage Bucket',
          severity: 'CRITICAL',
          technicalExplanation: `The storage bucket "${res.resourceName || res.resourceId}" has public read/write access permitted without S3 Public Access Block restrictions. Data stored within this bucket is directly accessible via the public internet.`,
          evidence: {
            isPublic: res.isPublic,
            acl: res.policyRules?.acl,
            publicAccessBlock: res.policyRules?.publicAccessBlock
          },
          suggestedRemediation: 'Enable S3 Block Public Access and reset bucket ACL to private.',
          remediationAction: 'BLOCK_PUBLIC_ACCESS',
          status: 'OPEN'
        });
      }

      // Rule CLOUD_002: Unrestricted Ingress to Administrative Ports (SSH 22, RDP 3389)
      if (res.resourceType === 'SECURITY_GROUP' && Array.isArray(res.ingressRules)) {
        const riskyRules = res.ingressRules.filter(r => 
          (r.port === 22 || r.port === 3389) && (r.source === '0.0.0.0/0' || r.source === '::/0')
        );

        if (riskyRules.length > 0) {
          findings.push({
            findingId: `FIND-CLOUD-002-${res.resourceId}`,
            resourceId: res.resourceId,
            resourceName: res.resourceName || res.resourceId,
            resourceType: res.resourceType,
            policyId: 'CLOUD_002',
            title: 'Unrestricted Ingress to Administrative Ports (SSH/RDP)',
            severity: 'HIGH',
            technicalExplanation: `Security group "${res.resourceName}" defines ingress rule permitting inbound traffic from 0.0.0.0/0 (entire public internet) on sensitive administrative ports (${riskyRules.map(r => r.port).join(', ')}). Exposes management interfaces to brute force attacks.`,
            evidence: { riskyRules },
            suggestedRemediation: 'Restrict administrative ingress to specific corporate bastion IPs or VPN CIDR blocks.',
            remediationAction: 'RESTRICT_SECURITY_GROUP',
            status: 'OPEN'
          });
        }
      }

      // Rule CLOUD_003: Excessive Wildcard IAM Permissions
      if (res.resourceType === 'IAM_ROLE' && res.isOverprivileged === true) {
        findings.push({
          findingId: `FIND-CLOUD-003-${res.resourceId}`,
          resourceId: res.resourceId,
          resourceName: res.resourceName || res.resourceId,
          resourceType: res.resourceType,
          policyId: 'CLOUD_003',
          title: 'Excessive Wildcard IAM Policy Assignment',
          severity: 'HIGH',
          technicalExplanation: `IAM Role "${res.resourceName}" assigns full administrator permissions via wildcard ("*") actions across all resources. Violates the principle of least privilege.`,
          evidence: {
            statement: res.statement,
            attachedPolicies: res.attachedPolicies
          },
          suggestedRemediation: 'Scope IAM policy to least-privilege specific actions and restrict target ARNs.',
          remediationAction: 'RESTRICT_IAM_WILDCARD',
          status: 'OPEN'
        });
      }

      // Rule CLOUD_004: Unencrypted Sensitive Data Store
      if ((res.resourceType === 'RDS_DATABASE' || res.resourceType === 'S3_BUCKET') && res.encrypted === false) {
        findings.push({
          findingId: `FIND-CLOUD-004-${res.resourceId}`,
          resourceId: res.resourceId,
          resourceName: res.resourceName || res.resourceId,
          resourceType: res.resourceType,
          policyId: 'CLOUD_004',
          title: 'Unencrypted Sensitive Data Store at Rest',
          severity: 'MEDIUM',
          technicalExplanation: `Resource "${res.resourceName}" does not have KMS encryption enabled at rest. Unencrypted database or object volumes risk exposure if snapshot backups are leaked.`,
          evidence: { encrypted: false },
          suggestedRemediation: 'Enable AWS KMS server-side encryption with customer managed keys (CMK).',
          remediationAction: 'ENABLE_ENCRYPTION',
          status: 'OPEN'
        });
      }

      // Rule CLOUD_005: Disabled Security Audit Trail
      if (res.resourceType === 'AUDIT_TRAIL' && res.loggingEnabled === false) {
        findings.push({
          findingId: `FIND-CLOUD-005-${res.resourceId}`,
          resourceId: res.resourceId,
          resourceName: res.resourceName || res.resourceId,
          resourceType: res.resourceType,
          policyId: 'CLOUD_005',
          title: 'Disabled Cloud Security Audit Trail',
          severity: 'HIGH',
          technicalExplanation: `Global audit trail "${res.resourceName}" is configured but logging delivery is turned off. Disables forensic tracking of administrative API actions.`,
          evidence: { loggingEnabled: false },
          suggestedRemediation: 'Enable active log recording and forward trails to an immutable S3 bucket.',
          remediationAction: 'ENABLE_LOGGING',
          status: 'OPEN'
        });
      }
    }

    return findings;
  }
}
