const { firestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const LOCAL_DATA_FILE = path.join(__dirname, '../../data/local_store.json');

function getLocalStore() {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    }
  } catch (_e) {}
  return { career_records: {}, matches: {}, resume_drafts: {}, users: {}, interviews: {} };
}

function saveLocalStore(store) {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (_e) {}
}

const COLLECTIONS = {
  RECORDS: 'career_records',
  MATCHES: 'matches',
  DRAFTS: 'resume_drafts',
  USERS: 'users',
  INTERVIEWS: 'interviews',
};

/**
 * Error thrown when a document exists but belongs to a different user.
 * Carries an HTTP status so controllers can surface a 403 instead of a 500.
 */
class ForbiddenError extends Error {
  constructor(message = 'Forbidden: this resource does not belong to the authenticated user') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

/**
 * Verify that a Firestore document (or already-unwrapped object) is owned by
 * `userId`. Throws ForbiddenError (403) on an ownership mismatch. Returns the
 * plain data object on success so callers can spread it safely.
 */
function assertOwner(doc, userId) {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  if (!data || !data.userId || data.userId !== userId) {
    throw new ForbiddenError();
  }
  return data;
}

// Strip client-controlled identity/primary-key fields so a caller can never
// reassign ownership or the id of an existing document via an update payload.
function stripProtectedFields(data) {
  const { userId: _userId, id: _id, ...safe } = data || {};
  return safe;
}

/**
 * Helper to safely query with orderBy and fall back to in-memory sorting
 * if composite Firestore indexes are missing or building.
 */
async function safeQuery(collectionName, filterField, filterVal, sortField, sortDirection = 'desc', limit = 50) {
  try {
    const snapshot = await firestore
      .collection(collectionName)
      .where(filterField, '==', filterVal)
      .orderBy(sortField, sortDirection)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    try {
      const snapshot = await firestore
        .collection(collectionName)
        .where(filterField, '==', filterVal)
        .limit(limit * 2)
        .get();
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
        const valA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
        const valB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
      return list.slice(0, limit);
    } catch (_fallbackErr) {
      // Resilient local store fallback if Firestore API is disabled or inaccessible
      const store = getLocalStore();
      const collectionItems = Object.values(store[collectionName] || {});
      const matched = collectionItems.filter(item => item[filterField] === filterVal);
      matched.sort((a, b) => {
        const valA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
        const valB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
      return matched.slice(0, limit);
    }
  }
}

/**
 * Career Record Service — all methods are scoped to the owning user.
 */
class CareerRecordService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date();
    const record = {
      id,
      version: 1,
      ...stripProtectedFields(data),
      userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    try {
      await firestore.collection(COLLECTIONS.RECORDS).doc(id).set(record);
    } catch (err) {
      console.warn('Firestore set failed, persisting to resilient local store:', err.message);
      const store = getLocalStore();
      if (!store[COLLECTIONS.RECORDS]) store[COLLECTIONS.RECORDS] = {};
      store[COLLECTIONS.RECORDS][id] = record;
      saveLocalStore(store);
    }
    return record;
  }

  async get(id, userId) {
    try {
      const doc = await firestore.collection(COLLECTIONS.RECORDS).doc(id).get();
      if (doc.exists) {
        const data = assertOwner(doc, userId);
        return { id: doc.id, ...data };
      }
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      console.warn('Firestore get failed, checking resilient local store:', err.message);
    }
    const store = getLocalStore();
    const local = store[COLLECTIONS.RECORDS]?.[id];
    if (local && local.userId === userId) {
      return local;
    }
    return null;
  }

  async update(id, data, userId) {
    let current = null;
    try {
      const ref = firestore.collection(COLLECTIONS.RECORDS).doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        current = assertOwner(doc, userId);
      }
    } catch (_err) {}
    if (!current) {
      const store = getLocalStore();
      const local = store[COLLECTIONS.RECORDS]?.[id];
      if (local && local.userId === userId) {
        current = local;
      }
    }
    if (!current) return null;

    const nextVersion = (current.version || 0) + 1;
    const updateData = {
      ...current,
      ...stripProtectedFields(data),
      userId,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    try {
      await firestore.collection(COLLECTIONS.RECORDS).doc(id).set(updateData);
    } catch (err) {
      console.warn('Firestore update failed, updating resilient local store:', err.message);
      const store = getLocalStore();
      if (!store[COLLECTIONS.RECORDS]) store[COLLECTIONS.RECORDS] = {};
      store[COLLECTIONS.RECORDS][id] = { id, ...updateData };
      saveLocalStore(store);
    }
    return { id, ...updateData };
  }

  async delete(id, userId) {
    try {
      const ref = firestore.collection(COLLECTIONS.RECORDS).doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        assertOwner(doc, userId);
        await ref.delete();
      }
    } catch (err) {
      console.warn('Firestore record delete fallback to local store:', err.message);
    }
    const store = getLocalStore();
    if (store[COLLECTIONS.RECORDS] && store[COLLECTIONS.RECORDS][id]) {
      delete store[COLLECTIONS.RECORDS][id];
      saveLocalStore(store);
    }
    return { id };
  }

  async list(userId, limit = 50) {
    return safeQuery(COLLECTIONS.RECORDS, 'userId', userId, 'updatedAt', 'desc', limit);
  }
}

/**
 * Match Result Service — scoped by userId (and by parent record when listed).
 */
class MatchService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date().toISOString();
    const match = {
      id,
      ...stripProtectedFields(data),
      userId,
      createdAt: now,
    };
    try {
      await firestore.collection(COLLECTIONS.MATCHES).doc(id).set(match);
    } catch (err) {
      console.warn('Firestore match create fallback to local store:', err.message);
      const store = getLocalStore();
      if (!store[COLLECTIONS.MATCHES]) store[COLLECTIONS.MATCHES] = {};
      store[COLLECTIONS.MATCHES][id] = match;
      saveLocalStore(store);
    }
    return match;
  }

  async get(id, userId) {
    try {
      const doc = await firestore.collection(COLLECTIONS.MATCHES).doc(id).get();
      if (doc.exists) {
        const data = assertOwner(doc, userId);
        return { id: doc.id, ...data };
      }
    } catch (_err) {}
    const store = getLocalStore();
    const match = store[COLLECTIONS.MATCHES]?.[id];
    if (match && match.userId === userId) return match;
    return null;
  }

  async listByRecord(recordId, userId, limit = 20) {
    try {
      const snapshot = await firestore
        .collection(COLLECTIONS.MATCHES)
        .where('recordId', '==', recordId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('Match list fallback:', err.message);
      const store = getLocalStore();
      const all = Object.values(store[COLLECTIONS.MATCHES] || {})
        .filter((m) => m.recordId === recordId && m.userId === userId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return all.slice(0, limit);
    }
  }
}

/**
 * Resume Draft Service — scoped by userId (and by parent record when listed).
 */
class DraftService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date().toISOString();
    const draft = {
      id,
      status: 'draft',
      ...stripProtectedFields(data),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await firestore.collection(COLLECTIONS.DRAFTS).doc(id).set(draft);
    } catch (err) {
      console.warn('Firestore draft create fallback to local store:', err.message);
      const store = getLocalStore();
      if (!store[COLLECTIONS.DRAFTS]) store[COLLECTIONS.DRAFTS] = {};
      store[COLLECTIONS.DRAFTS][id] = draft;
      saveLocalStore(store);
    }
    return draft;
  }

  async get(id, userId) {
    try {
      const doc = await firestore.collection(COLLECTIONS.DRAFTS).doc(id).get();
      if (doc.exists) {
        const data = assertOwner(doc, userId);
        return { id: doc.id, ...data };
      }
    } catch (_err) {}
    const store = getLocalStore();
    const draft = store[COLLECTIONS.DRAFTS]?.[id];
    if (draft && draft.userId === userId) return draft;
    return null;
  }

  async update(id, data, userId) {
    let updatedObj = null;
    try {
      const ref = firestore.collection(COLLECTIONS.DRAFTS).doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        assertOwner(doc, userId);
        await ref.update({
          ...stripProtectedFields(data),
          userId,
          updatedAt: new Date().toISOString(),
        });
        const updated = await ref.get();
        updatedObj = { id: updated.id, ...updated.data() };
      }
    } catch (_err) {}

    const store = getLocalStore();
    if (!store[COLLECTIONS.DRAFTS]) store[COLLECTIONS.DRAFTS] = {};
    const existing = store[COLLECTIONS.DRAFTS][id] || {};
    const merged = {
      ...existing,
      ...stripProtectedFields(data),
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store[COLLECTIONS.DRAFTS][id] = merged;
    saveLocalStore(store);
    return updatedObj || merged;
  }

  async listByRecord(recordId, userId, limit = 20) {
    try {
      const snapshot = await firestore
        .collection(COLLECTIONS.DRAFTS)
        .where('recordId', '==', recordId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('Draft list fallback:', err.message);
      const store = getLocalStore();
      const all = Object.values(store[COLLECTIONS.DRAFTS] || {})
        .filter((d) => d.recordId === recordId && d.userId === userId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return all.slice(0, limit);
    }
  }
}

/**
 * Interview Intelligence Service — scoped by userId.
 */
class InterviewService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date().toISOString();
    const interview = {
      id,
      ...stripProtectedFields(data),
      userId,
      createdAt: now,
    };
    try {
      await firestore.collection(COLLECTIONS.INTERVIEWS).doc(id).set(interview);
    } catch (err) {
      console.warn('Firestore interview create fallback to local store:', err.message);
      const store = getLocalStore();
      if (!store[COLLECTIONS.INTERVIEWS]) store[COLLECTIONS.INTERVIEWS] = {};
      store[COLLECTIONS.INTERVIEWS][id] = interview;
      saveLocalStore(store);
    }
    return interview;
  }

  async get(id, userId) {
    try {
      const doc = await firestore.collection(COLLECTIONS.INTERVIEWS).doc(id).get();
      if (doc.exists) {
        const data = assertOwner(doc, userId);
        return { id: doc.id, ...data };
      }
    } catch (_err) {}
    const store = getLocalStore();
    const interview = store[COLLECTIONS.INTERVIEWS]?.[id];
    if (interview && interview.userId === userId) return interview;
    return null;
  }

  async listByRecord(recordId, userId, limit = 20) {
    try {
      const snapshot = await firestore
        .collection(COLLECTIONS.INTERVIEWS)
        .where('recordId', '==', recordId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (_err) {
      const store = getLocalStore();
      const all = Object.values(store[COLLECTIONS.INTERVIEWS] || {})
        .filter((i) => i.recordId === recordId && i.userId === userId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return all.slice(0, limit);
    }
  }
}

/**
 * SaaS User Service — handles subscription tiers, credits, quotas, and feature flags.
 */
class UserService {
  static TIERS = {
    free: {
      id: 'free',
      name: 'Starter',
      matchLimit: 10,
      draftLimit: 5,
      exportLimit: 10,
      interviewCoach: false,
      deepAtsOptimizer: false,
      multiTemplates: false,
    },
    pro: {
      id: 'pro',
      name: 'Career Intelligence Pro',
      matchLimit: 500,
      draftLimit: 250,
      exportLimit: 500,
      interviewCoach: true,
      deepAtsOptimizer: true,
      multiTemplates: true,
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise Executive',
      matchLimit: 9999,
      draftLimit: 9999,
      exportLimit: 9999,
      interviewCoach: true,
      deepAtsOptimizer: true,
      multiTemplates: true,
    },
  };

  async getProfile(userId, userEmail = '') {
    if (!userId) throw new Error('userId is required');
    try {
      const ref = firestore.collection(COLLECTIONS.USERS).doc(userId);
      const doc = await ref.get();
      
      if (!doc.exists) {
        const initial = {
          userId,
          email: userEmail,
          tier: 'pro',
          usage: {
            matches: 0,
            drafts: 0,
            reviews: 0,
            exports: 0,
            interviews: 0,
            resumesParsed: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await ref.set(initial);
        return { ...initial, tierConfig: UserService.TIERS.pro };
      }

      const data = doc.data();
      const tierConfig = UserService.TIERS[data.tier] || UserService.TIERS.free;
      return { ...data, tierConfig };
    } catch (err) {
      console.warn('UserService getProfile fallback:', err.message);
      return {
        userId,
        email: userEmail,
        tier: 'pro',
        usage: { matches: 0, drafts: 0, reviews: 0, exports: 0, interviews: 0, resumesParsed: 0 },
        tierConfig: UserService.TIERS.pro,
      };
    }
  }

  async recordUsage(userId, metricName) {
    if (!userId) return;
    try {
      const ref = firestore.collection(COLLECTIONS.USERS).doc(userId);
      const doc = await ref.get();
      if (!doc.exists) return;
      const currentUsage = doc.data().usage || {};
      const updatedCount = (currentUsage[metricName] || 0) + 1;
      await ref.update({
        [`usage.${metricName}`]: updatedCount,
        updatedAt: new Date(),
      });
    } catch (err) {
      // Resilient local store fallback for usage tracking
      try {
        const store = readLocalStore();
        const user = store.users[userId] || {
          userId,
          email: `${userId}@credensa.app`,
          tier: 'pro',
          usage: { matches: 0, drafts: 0, reviews: 0, exports: 0, interviews: 0, resumesParsed: 0 },
        };
        user.usage = user.usage || {};
        user.usage[metricName] = (user.usage[metricName] || 0) + 1;
        user.updatedAt = new Date().toISOString();
        store.users[userId] = user;
        writeLocalStore(store);
      } catch (localErr) {
        console.warn('Failed to record SaaS usage locally:', localErr.message);
      }
    }
  }

  async updateTier(userId, tier) {
    if (!UserService.TIERS[tier]) throw new Error('Invalid tier');
    try {
      const ref = firestore.collection(COLLECTIONS.USERS).doc(userId);
      await ref.set({ tier, updatedAt: new Date() }, { merge: true });
      return this.getProfile(userId);
    } catch (err) {
      try {
        const store = readLocalStore();
        const user = store.users[userId] || {
          userId,
          email: `${userId}@credensa.app`,
          usage: { matches: 0, drafts: 0, reviews: 0, exports: 0, interviews: 0, resumesParsed: 0 },
        };
        user.tier = tier;
        user.updatedAt = new Date().toISOString();
        store.users[userId] = user;
        writeLocalStore(store);
        return {
          userId,
          email: user.email,
          tier: user.tier,
          usage: user.usage,
          tierConfig: UserService.TIERS[tier],
        };
      } catch (localErr) {
        return this.getProfile(userId);
      }
    }
  }
}

module.exports = {
  CareerRecordService,
  MatchService,
  DraftService,
  InterviewService,
  UserService,
  COLLECTIONS,
  ForbiddenError,
  assertOwner,
};
