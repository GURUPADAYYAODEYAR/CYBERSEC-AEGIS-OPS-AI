/**
 * AegisOpsDB - Browser IndexedDB Storage with in-memory fallback.
 */

const DB_NAME = 'AegisOpsDB';
const DB_VERSION = 1;

export const STORES = {
  SECURITY_EVENTS: 'securityEvents',
  IDENTITIES: 'identities',
  DEVICES: 'devices',
  CLOUD_RESOURCES: 'cloudResources',
  AGENT_SESSIONS: 'agentSessions',
  DETECTION_RULES: 'detectionRules',
  FINDINGS: 'findings',
  ALERTS: 'alerts',
  INCIDENTS: 'incidents',
  INCIDENT_NOTES: 'incidentNotes',
  SIMULATION_RUNS: 'simulationRuns',
  SETTINGS: 'applicationSettings'
};

// In-memory memory-store for SSR/Node/Vitest or disabled IndexedDB
const memoryStore = {};
Object.values(STORES).forEach(store => {
  memoryStore[store] = new Map();
});

let dbInstance = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null; // Fallback to memoryStore
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create stores if they do not exist
      if (!db.objectStoreNames.contains(STORES.SECURITY_EVENTS)) {
        const store = db.createObjectStore(STORES.SECURITY_EVENTS, { keyPath: 'eventId' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('sourceIp', 'sourceIp', { unique: false });
        store.createIndex('eventType', 'eventType', { unique: false });
        store.createIndex('severity', 'severity', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.IDENTITIES)) {
        db.createObjectStore(STORES.IDENTITIES, { keyPath: 'userId' });
      }

      if (!db.objectStoreNames.contains(STORES.DEVICES)) {
        db.createObjectStore(STORES.DEVICES, { keyPath: 'deviceId' });
      }

      if (!db.objectStoreNames.contains(STORES.CLOUD_RESOURCES)) {
        const store = db.createObjectStore(STORES.CLOUD_RESOURCES, { keyPath: 'resourceId' });
        store.createIndex('resourceType', 'resourceType', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AGENT_SESSIONS)) {
        db.createObjectStore(STORES.AGENT_SESSIONS, { keyPath: 'sessionId' });
      }

      if (!db.objectStoreNames.contains(STORES.DETECTION_RULES)) {
        db.createObjectStore(STORES.DETECTION_RULES, { keyPath: 'ruleId' });
      }

      if (!db.objectStoreNames.contains(STORES.FINDINGS)) {
        const store = db.createObjectStore(STORES.FINDINGS, { keyPath: 'findingId' });
        store.createIndex('severity', 'severity', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ALERTS)) {
        const store = db.createObjectStore(STORES.ALERTS, { keyPath: 'alertId' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('severity', 'severity', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.INCIDENTS)) {
        const store = db.createObjectStore(STORES.INCIDENTS, { keyPath: 'incidentId' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('severity', 'severity', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.INCIDENT_NOTES)) {
        const store = db.createObjectStore(STORES.INCIDENT_NOTES, { keyPath: 'noteId' });
        store.createIndex('incidentId', 'incidentId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SIMULATION_RUNS)) {
        db.createObjectStore(STORES.SIMULATION_RUNS, { keyPath: 'runId' });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB failed to open, falling back to memory store:', event.target.error);
      resolve(null);
    };
  });
}

/**
 * Generic Read All from a store.
 */
export async function getAllFromStore(storeName) {
  const db = await getDatabase();
  if (!db) {
    return Array.from(memoryStore[storeName]?.values() || []);
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (err) {
      // Fallback
      resolve(Array.from(memoryStore[storeName]?.values() || []));
    }
  });
}

/**
 * Generic Put / Upsert into a store.
 */
export async function putInStore(storeName, item, keyField = 'id') {
  const db = await getDatabase();
  const key = item[keyField] || item.id || item.key;
  if (memoryStore[storeName] && key) {
    memoryStore[storeName].set(key, item);
  }

  if (!db) return item;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    } catch (err) {
      resolve(item);
    }
  });
}

/**
 * Generic Batch Put into a store.
 */
export async function putBatchInStore(storeName, items, keyField = 'id') {
  const db = await getDatabase();
  if (memoryStore[storeName]) {
    items.forEach(item => {
      const key = item[keyField] || item.id || item.key;
      if (key) memoryStore[storeName].set(key, item);
    });
  }

  if (!db) return items;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve(items);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      resolve(items);
    }
  });
}

/**
 * Clear a store.
 */
export async function clearStore(storeName) {
  const db = await getDatabase();
  if (memoryStore[storeName]) {
    memoryStore[storeName].clear();
  }

  if (!db) return true;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    } catch (err) {
      resolve(true);
    }
  });
}
