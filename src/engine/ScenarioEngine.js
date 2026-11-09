import {
  EventsRepository,
  CloudResourcesRepository,
  IdentitiesRepository,
  IncidentsRepository,
  AlertsRepository
} from '../storage/repositories.js';

import { DetectionEngine } from './DetectionEngine.js';
import { CorrelationEngine } from './CorrelationEngine.js';

export const SCENARIOS = [
  {
    id: 'scenario-1',
    name: 'Scenario 1: Suspicious Login Burst',
    category: 'Identity Threat',
    description: 'Generates a concentrated burst of failed authentication attempts against Sarah Chen followed by a successful login from a foreign IP.',
    eventsCount: 4,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc1-01-${Date.now()}`,
          timestamp: new Date(now.getTime() - 6 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_ATTEMPT',
          outcome: 'FAILURE',
          userId: 'user-schen',
          sourceIp: '194.26.29.111',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'LOW',
          metadata: { reason: 'BAD_PASSWORD', geo: { city: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234 } }
        },
        {
          eventId: `evt-sc1-02-${Date.now()}`,
          timestamp: new Date(now.getTime() - 4 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_ATTEMPT',
          outcome: 'FAILURE',
          userId: 'user-schen',
          sourceIp: '194.26.29.111',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'LOW',
          metadata: { reason: 'BAD_PASSWORD', geo: { city: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234 } }
        },
        {
          eventId: `evt-sc1-03-${Date.now()}`,
          timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_ATTEMPT',
          outcome: 'FAILURE',
          userId: 'user-schen',
          sourceIp: '194.26.29.111',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'MEDIUM',
          metadata: { reason: 'BAD_PASSWORD', geo: { city: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234 } }
        },
        {
          eventId: `evt-sc1-04-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          userId: 'user-schen',
          sourceIp: '194.26.29.111',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'HIGH',
          metadata: { mfaBypassed: false, geo: { city: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234 } }
        }
      ];
    }
  },
  {
    id: 'scenario-2',
    name: 'Scenario 2: Privilege Escalation Indicator',
    category: 'Cloud Identity',
    description: 'Simulates an unauthorized role modification where a developer role is assigned full AdministratorAccess permissions.',
    eventsCount: 2,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc2-01-${Date.now()}`,
          timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'AttachRolePolicy',
          outcome: 'SUCCESS',
          userId: 'user-jtaylor',
          sourceIp: '203.0.113.88',
          destinationIp: '169.254.169.254',
          hostname: 'iam.amazonaws.com',
          resourceId: 'iam-role-devops-wildcard',
          severity: 'HIGH',
          metadata: {
            policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
            addedPermissions: ['*']
          }
        },
        {
          eventId: `evt-sc2-02-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'ADMIN_ACTION',
          action: 'CreateAccessKey',
          outcome: 'SUCCESS',
          userId: 'user-jtaylor',
          sourceIp: '203.0.113.88',
          destinationIp: '169.254.169.254',
          hostname: 'iam.amazonaws.com',
          resourceId: 'iam-role-devops-wildcard',
          severity: 'HIGH',
          metadata: { keyId: 'AKIA_SIMULATED_KEY_441' }
        }
      ];
    }
  },
  {
    id: 'scenario-3',
    name: 'Scenario 3: Cloud Storage Exposure',
    category: 'Cloud Security',
    description: 'Simulates the creation or modification of a storage bucket with public read access enabled, violating posture baselines.',
    eventsCount: 2,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc3-01-${Date.now()}`,
          timestamp: new Date(now.getTime() - 3 * 60000).toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'DeletePublicAccessBlock',
          outcome: 'SUCCESS',
          userId: 'user-mvance',
          sourceIp: '198.51.100.105',
          destinationIp: '169.254.169.254',
          hostname: 's3.amazonaws.com',
          resourceId: 's3-corporate-finance-vault',
          severity: 'HIGH',
          metadata: { blockRemoved: true }
        },
        {
          eventId: `evt-sc3-02-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'PutBucketAcl',
          outcome: 'SUCCESS',
          userId: 'user-mvance',
          sourceIp: '198.51.100.105',
          destinationIp: '169.254.169.254',
          hostname: 's3.amazonaws.com',
          resourceId: 's3-corporate-finance-vault',
          severity: 'CRITICAL',
          metadata: { acl: 'public-read-write' }
        }
      ];
    }
  },
  {
    id: 'scenario-4',
    name: 'Scenario 4: Multi-Stage Identity and Cloud Incident',
    category: 'Cross-Module Incident',
    description: 'Executes a linked kill chain: suspicious login, impossible travel, IAM escalation, and public storage exposure.',
    eventsCount: 5,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc4-01-${Date.now()}`,
          timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_ATTEMPT',
          outcome: 'FAILURE',
          userId: 'user-schen',
          sourceIp: '185.220.101.5',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'MEDIUM',
          metadata: { geo: { city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821 } }
        },
        {
          eventId: `evt-sc4-02-${Date.now()}`,
          timestamp: new Date(now.getTime() - 22 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          userId: 'user-schen',
          sourceIp: '185.220.101.5',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'HIGH',
          metadata: { geo: { city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821 } }
        },
        {
          eventId: `evt-sc4-03-${Date.now()}`,
          timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          userId: 'user-schen',
          sourceIp: '203.0.113.190',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'CRITICAL',
          metadata: {
            geo: { city: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
            distanceFromPreviousKm: 9330,
            elapsedMinutes: 12,
            impliedSpeedKmh: 46650
          }
        },
        {
          eventId: `evt-sc4-04-${Date.now()}`,
          timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'PutRolePolicy',
          outcome: 'SUCCESS',
          userId: 'user-schen',
          sourceIp: '203.0.113.190',
          destinationIp: '169.254.169.254',
          hostname: 'iam.amazonaws.com',
          resourceId: 'iam-role-devops-wildcard',
          severity: 'HIGH',
          metadata: { addedPermissions: ['*'] }
        },
        {
          eventId: `evt-sc4-05-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'PutBucketAcl',
          outcome: 'SUCCESS',
          userId: 'user-schen',
          sourceIp: '203.0.113.190',
          destinationIp: '169.254.169.254',
          hostname: 's3.amazonaws.com',
          resourceId: 's3-corporate-finance-vault',
          severity: 'CRITICAL',
          metadata: { acl: 'public-read-write' }
        }
      ];
    }
  },
  {
    id: 'scenario-5',
    name: 'Scenario 5: AI Agent Trust Boundary Violation',
    category: 'AI Security',
    description: 'Simulates an indirect prompt injection attack attempting to coerce the internal AI assistant to exfiltrate AWS credentials.',
    eventsCount: 1,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc5-01-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'AgentGuard_Runtime',
          eventType: 'AI_AGENT_EXECUTION',
          action: 'TOOL_CALL_ATTEMPT',
          outcome: 'BLOCKED',
          userId: 'user-schen',
          sourceIp: '203.0.113.190',
          destinationIp: '10.0.10.50',
          hostname: 'agent-runtime-node-03',
          resourceId: 'agent-session-4412',
          severity: 'CRITICAL',
          metadata: {
            agentName: 'Enterprise Assistant (Simulated)',
            tool: 'read_filesystem_secret',
            target: '~/.aws/credentials',
            detectionReason: 'Indirect Prompt Injection detected in retrieved document context'
          }
        }
      ];
    }
  },
  {
    id: 'scenario-6',
    name: 'Scenario 6: Normal Enterprise Baseline Activity',
    category: 'Benign Traffic',
    description: 'Generates ordinary, benign authentication and file read events that do not trigger high or critical security alerts.',
    eventsCount: 4,
    generator: () => {
      const now = new Date();
      return [
        {
          eventId: `evt-sc6-01-${Date.now()}`,
          timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          userId: 'user-arivera',
          sourceIp: '198.51.100.22',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'INFO',
          metadata: { geo: { city: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 } }
        },
        {
          eventId: `evt-sc6-02-${Date.now()}`,
          timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
          source: 'CrowdStrike_EDR',
          eventType: 'ENDPOINT_ACTIVITY',
          action: 'FILE_READ',
          outcome: 'SUCCESS',
          userId: 'user-arivera',
          sourceIp: '198.51.100.22',
          destinationIp: '10.0.2.14',
          hostname: 'secops-workstation-01',
          resourceId: 'doc-security-policy.pdf',
          severity: 'INFO',
          metadata: { processName: 'acrobat.exe' }
        },
        {
          eventId: `evt-sc6-03-${Date.now()}`,
          timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
          source: 'Okta_IdP',
          eventType: 'AUTHENTICATION',
          action: 'USER_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          userId: 'user-jtaylor',
          sourceIp: '203.0.113.88',
          destinationIp: '10.0.0.15',
          hostname: 'auth-gateway-01',
          resourceId: 'okta-auth-service',
          severity: 'INFO',
          metadata: { geo: { city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 } }
        },
        {
          eventId: `evt-sc6-04-${Date.now()}`,
          timestamp: now.toISOString(),
          source: 'AWS_CloudTrail',
          eventType: 'CLOUD_AUDIT',
          action: 'DescribeInstances',
          outcome: 'SUCCESS',
          userId: 'user-jtaylor',
          sourceIp: '203.0.113.88',
          destinationIp: '169.254.169.254',
          hostname: 'ec2.amazonaws.com',
          resourceId: 'ec2-web-frontend-01',
          severity: 'INFO',
          metadata: { region: 'us-east-1' }
        }
      ];
    }
  }
];

export class ScenarioEngine {
  constructor() {
    this.activeScenario = null;
    this.playbackQueue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.timer = null;
    this.speedMultiplier = 1; // 1x, 2x, 5x, 10x
    this.onStepCallback = null;
    this.onCompleteCallback = null;
  }

  loadScenario(scenarioId) {
    this.stop();
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    this.activeScenario = scenario;
    this.playbackQueue = scenario.generator();
    this.currentIndex = 0;
    this.isPlaying = false;
    return this.playbackQueue;
  }

  setSpeed(speed) {
    this.speedMultiplier = speed;
    if (this.isPlaying) {
      this.pause();
      this.play(this.onStepCallback, this.onCompleteCallback);
    }
  }

  async play(onStep, onComplete) {
    this.onStepCallback = onStep;
    this.onCompleteCallback = onComplete;
    this.isPlaying = true;

    const baseDelay = 1200; // ms per event
    const delay = Math.max(150, Math.round(baseDelay / this.speedMultiplier));

    const step = async () => {
      if (!this.isPlaying) return;

      if (this.currentIndex < this.playbackQueue.length) {
        const event = this.playbackQueue[this.currentIndex];
        await EventsRepository.add(event);
        this.currentIndex++;

        if (this.onStepCallback) {
          this.onStepCallback({
            event,
            index: this.currentIndex,
            total: this.playbackQueue.length,
            percent: Math.round((this.currentIndex / this.playbackQueue.length) * 100)
          });
        }

        this.timer = setTimeout(step, delay);
      } else {
        this.isPlaying = false;
        // Run detection & correlation at the end of scenario
        await DetectionEngine.runFullDetection();
        await CorrelationEngine.correlate();

        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }
    };

    step();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
  }
}
