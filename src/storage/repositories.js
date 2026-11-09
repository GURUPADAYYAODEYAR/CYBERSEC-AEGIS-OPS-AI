/**
 * Unified Repositories for AEGIS OPS AI.
 * Handles database interaction with synchronization and business domain logic.
 */

import {
  STORES,
  getAllFromStore,
  putInStore,
  putBatchInStore,
  clearStore
} from './database.js';

import {
  SEED_IDENTITIES,
  SEED_CLOUD_RESOURCES,
  SEED_DETECTION_RULES,
  SEED_AGENT_TEST_CASES,
  INITIAL_DEMO_EVENTS
} from './seedData.js';

// --- Events Repository ---
export const EventsRepository = {
  async getAll() {
    const list = await getAllFromStore(STORES.SECURITY_EVENTS);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async add(event) {
    return putInStore(STORES.SECURITY_EVENTS, event, 'eventId');
  },

  async addBatch(events) {
    return putBatchInStore(STORES.SECURITY_EVENTS, events, 'eventId');
  },

  async clear() {
    return clearStore(STORES.SECURITY_EVENTS);
  },

  async count() {
    const events = await this.getAll();
    return events.length;
  }
};

// --- Identities Repository ---
export const IdentitiesRepository = {
  async getAll() {
    return getAllFromStore(STORES.IDENTITIES);
  },

  async getById(userId) {
    const all = await this.getAll();
    return all.find(i => i.userId === userId) || null;
  },

  async save(identity) {
    return putInStore(STORES.IDENTITIES, identity, 'userId');
  },

  async saveBatch(identities) {
    return putBatchInStore(STORES.IDENTITIES, identities, 'userId');
  },

  async updateRiskScore(userId, score, factors = []) {
    const identity = await this.getById(userId);
    if (identity) {
      identity.riskScore = score;
      identity.riskFactors = factors;
      await this.save(identity);
    }
  }
};

// --- Cloud Resources Repository ---
export const CloudResourcesRepository = {
  async getAll() {
    return getAllFromStore(STORES.CLOUD_RESOURCES);
  },

  async getById(resourceId) {
    const all = await this.getAll();
    return all.find(r => r.resourceId === resourceId) || null;
  },

  async save(resource) {
    return putInStore(STORES.CLOUD_RESOURCES, resource, 'resourceId');
  },

  async saveBatch(resources) {
    return putBatchInStore(STORES.CLOUD_RESOURCES, resources, 'resourceId');
  },

  async remediate(resourceId, actionType) {
    const resource = await this.getById(resourceId);
    if (!resource) return null;

    if (actionType === 'BLOCK_PUBLIC_ACCESS' && resource.resourceType === 'S3_BUCKET') {
      resource.isPublic = false;
      if (resource.policyRules) {
        resource.policyRules.publicAccessBlock = true;
        resource.policyRules.acl = 'private';
      }
    } else if (actionType === 'ENABLE_ENCRYPTION') {
      resource.encrypted = true;
    } else if (actionType === 'RESTRICT_SECURITY_GROUP' && resource.resourceType === 'SECURITY_GROUP') {
      if (resource.ingressRules) {
        resource.ingressRules = resource.ingressRules.filter(r => !r.isRisky);
      }
    } else if (actionType === 'RESTRICT_IAM_WILDCARD' && resource.resourceType === 'IAM_ROLE') {
      resource.isOverprivileged = false;
      resource.statement = [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:ListBucket'],
          Resource: 'arn:aws:s3:::aegis-security-audit-logs/*'
        }
      ];
    } else if (actionType === 'ENABLE_LOGGING' && resource.resourceType === 'AUDIT_TRAIL') {
      resource.loggingEnabled = true;
    }

    resource.remediatedAt = new Date().toISOString();
    await this.save(resource);
    return resource;
  }
};

// --- Detection Rules Repository ---
export const DetectionRulesRepository = {
  async getAll() {
    return getAllFromStore(STORES.DETECTION_RULES);
  },

  async saveBatch(rules) {
    return putBatchInStore(STORES.DETECTION_RULES, rules, 'ruleId');
  },

  async toggleRule(ruleId) {
    const rules = await this.getAll();
    const rule = rules.find(r => r.ruleId === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      await putInStore(STORES.DETECTION_RULES, rule, 'ruleId');
      return rule;
    }
    return null;
  }
};

// --- Alerts Repository ---
export const AlertsRepository = {
  async getAll() {
    const list = await getAllFromStore(STORES.ALERTS);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async add(alert) {
    return putInStore(STORES.ALERTS, alert, 'alertId');
  },

  async addBatch(alerts) {
    return putBatchInStore(STORES.ALERTS, alerts, 'alertId');
  },

  async clear() {
    return clearStore(STORES.ALERTS);
  }
};

// --- Incidents Repository ---
export const IncidentsRepository = {
  async getAll() {
    const list = await getAllFromStore(STORES.INCIDENTS);
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  },

  async getById(incidentId) {
    const list = await this.getAll();
    return list.find(i => i.incidentId === incidentId) || null;
  },

  async save(incident) {
    incident.updatedAt = new Date().toISOString();
    return putInStore(STORES.INCIDENTS, incident, 'incidentId');
  },

  async saveBatch(incidents) {
    return putBatchInStore(STORES.INCIDENTS, incidents, 'incidentId');
  },

  async updateStatus(incidentId, status) {
    const incident = await this.getById(incidentId);
    if (incident) {
      incident.status = status;
      incident.updatedAt = new Date().toISOString();
      await this.save(incident);
      return incident;
    }
    return null;
  },

  async assignAnalyst(incidentId, analystName) {
    const incident = await this.getById(incidentId);
    if (incident) {
      incident.assignedAnalyst = analystName;
      incident.updatedAt = new Date().toISOString();
      await this.save(incident);
      return incident;
    }
    return null;
  },

  async addNote(incidentId, author, text) {
    const note = {
      noteId: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId,
      author: author || 'Alex Rivera (SecOps)',
      timestamp: new Date().toISOString(),
      text
    };
    await putInStore(STORES.INCIDENT_NOTES, note, 'noteId');
    return note;
  },

  async getNotes(incidentId) {
    const allNotes = await getAllFromStore(STORES.INCIDENT_NOTES);
    return allNotes
      .filter(n => n.incidentId === incidentId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  async clear() {
    await clearStore(STORES.INCIDENT_NOTES);
    return clearStore(STORES.INCIDENTS);
  }
};

// --- Settings Repository ---
export const SettingsRepository = {
  async get(key, defaultValue = null) {
    const all = await getAllFromStore(STORES.SETTINGS);
    const item = all.find(s => s.key === key);
    return item ? item.value : defaultValue;
  },

  async set(key, value) {
    return putInStore(STORES.SETTINGS, { key, value }, 'key');
  }
};

// --- DataStore Manager ---
export const DataStoreManager = {
  async initializeDefaultData(forceReset = false) {
    const existingEvents = await EventsRepository.getAll();
    if (existingEvents.length > 0 && !forceReset) {
      return { initialized: false, message: 'Existing data found. Preserving current state.' };
    }

    // Seed all collections
    await IdentitiesRepository.saveBatch(SEED_IDENTITIES);
    await CloudResourcesRepository.saveBatch(SEED_CLOUD_RESOURCES);
    await DetectionRulesRepository.saveBatch(SEED_DETECTION_RULES);
    await EventsRepository.addBatch(INITIAL_DEMO_EVENTS);

    // Initial seed incident
    const initialIncident = {
      incidentId: 'INC-2026-0881',
      title: 'Multi-Stage Identity Compromise and Cloud Infrastructure Exposure',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      assignedAnalyst: 'Alex Rivera (SecOps Lead)',
      createdAt: '2026-11-09T08:52:00.000Z',
      updatedAt: '2026-11-09T09:10:00.000Z',
      entities: ['user-schen', '185.220.101.5', '203.0.113.190', 's3-corporate-finance-vault', 'iam-role-devops-wildcard'],
      triggeringAlerts: ['ALT-AUTH-001', 'ALT-AUTH-003', 'ALT-CLOUD-001', 'ALT-AGENT-001'],
      evidenceEventIds: ['evt-1001', 'evt-1002', 'evt-1003', 'evt-1004', 'evt-1005', 'evt-1006', 'evt-1007', 'evt-1008'],
      summary: 'Automated correlation identified an authentication brute-force burst against Sarah Chen, followed by successful login from Germany, an impossible travel velocity login from Japan 11.5 mins later, unauthorized IAM privilege escalation, S3 bucket public ACL modification, and an attempted indirect prompt injection against the internal AI agent runtime.'
    };
    await IncidentsRepository.save(initialIncident);

    await IncidentsRepository.addNote(
      'INC-2026-0881',
      'Alex Rivera (SecOps Lead)',
      'Initial triage confirmed suspicious IP 185.220.101.5 is a known Tor exit relay. Account user-schen was accessed from Tokyo shortly after. Recommending credential revocation and cloud permission rollback.'
    );

    return { initialized: true, message: 'Synthetic cybersecurity demonstration data seeded successfully.' };
  },

  async exportFullDatabaseAsJson() {
    const [events, identities, cloudResources, rules, alerts, incidents, notes] = await Promise.all([
      EventsRepository.getAll(),
      IdentitiesRepository.getAll(),
      CloudResourcesRepository.getAll(),
      DetectionRulesRepository.getAll(),
      AlertsRepository.getAll(),
      IncidentsRepository.getAll(),
      getAllFromStore(STORES.INCIDENT_NOTES)
    ]);

    return JSON.stringify(
      {
        platform: 'AEGIS OPS AI',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        data: {
          securityEvents: events,
          identities,
          cloudResources,
          detectionRules: rules,
          alerts,
          incidents,
          incidentNotes: notes
        }
      },
      null,
      2
    );
  },

  async importDatabaseFromJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    const data = parsed.data || parsed;

    if (data.securityEvents) await EventsRepository.addBatch(data.securityEvents);
    if (data.identities) await IdentitiesRepository.saveBatch(data.identities);
    if (data.cloudResources) await CloudResourcesRepository.saveBatch(data.cloudResources);
    if (data.detectionRules) await DetectionRulesRepository.saveBatch(data.detectionRules);
    if (data.alerts) await AlertsRepository.addBatch(data.alerts);
    if (data.incidents) await IncidentsRepository.saveBatch(data.incidents);
    if (data.incidentNotes) await putBatchInStore(STORES.INCIDENT_NOTES, data.incidentNotes, 'noteId');

    return true;
  },

  async resetToDemoDefaults() {
    await Promise.all([
      EventsRepository.clear(),
      clearStore(STORES.IDENTITIES),
      clearStore(STORES.CLOUD_RESOURCES),
      clearStore(STORES.DETECTION_RULES),
      AlertsRepository.clear(),
      IncidentsRepository.clear(),
      clearStore(STORES.AGENT_SESSIONS)
    ]);

    return this.initializeDefaultData(true);
  }
};
