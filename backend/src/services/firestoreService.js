const { firestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const COLLECTIONS = {
  RECORDS: 'career_records',
  MATCHES: 'matches',
  DRAFTS: 'resume_drafts',
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
      createdAt: now,
      updatedAt: now,
    };
    await firestore.collection(COLLECTIONS.RECORDS).doc(id).set(record);
    return record;
  }

  async get(id, userId) {
    const doc = await firestore.collection(COLLECTIONS.RECORDS).doc(id).get();
    if (!doc.exists) return null;
    const data = assertOwner(doc, userId);
    return { id: doc.id, ...data };
  }

  async update(id, data, userId) {
    const ref = firestore.collection(COLLECTIONS.RECORDS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const current = assertOwner(doc, userId);
    const nextVersion = (current.version || 0) + 1;
    const updateData = {
      ...current,
      ...stripProtectedFields(data),
      userId,
      version: nextVersion,
      updatedAt: new Date(),
    };

    await ref.set(updateData);
    return { id, ...updateData };
  }

  async delete(id, userId) {
    const ref = firestore.collection(COLLECTIONS.RECORDS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    assertOwner(doc, userId);
    await ref.delete();
    return { id };
  }

  async list(userId, limit = 50) {
    const snapshot = await firestore
      .collection(COLLECTIONS.RECORDS)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

/**
 * Match Result Service — scoped by userId (and by parent record when listed).
 */
class MatchService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date();
    const match = {
      id,
      ...stripProtectedFields(data),
      userId,
      createdAt: now,
    };
    await firestore.collection(COLLECTIONS.MATCHES).doc(id).set(match);
    return match;
  }

  async get(id, userId) {
    const doc = await firestore.collection(COLLECTIONS.MATCHES).doc(id).get();
    if (!doc.exists) return null;
    const data = assertOwner(doc, userId);
    return { id: doc.id, ...data };
  }

  async listByRecord(recordId, userId, limit = 20) {
    const snapshot = await firestore
      .collection(COLLECTIONS.MATCHES)
      .where('recordId', '==', recordId)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

/**
 * Resume Draft Service — scoped by userId (and by parent record when listed).
 */
class DraftService {
  async create(data, userId) {
    if (!userId) throw new Error('userId is required');
    const id = uuidv4();
    const now = new Date();
    const draft = {
      id,
      status: 'draft',
      ...stripProtectedFields(data),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    await firestore.collection(COLLECTIONS.DRAFTS).doc(id).set(draft);
    return draft;
  }

  async get(id, userId) {
    const doc = await firestore.collection(COLLECTIONS.DRAFTS).doc(id).get();
    if (!doc.exists) return null;
    const data = assertOwner(doc, userId);
    return { id: doc.id, ...data };
  }

  async update(id, data, userId) {
    const ref = firestore.collection(COLLECTIONS.DRAFTS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    assertOwner(doc, userId);

    await ref.update({
      ...stripProtectedFields(data),
      userId,
      updatedAt: new Date(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async listByRecord(recordId, userId, limit = 20) {
    const snapshot = await firestore
      .collection(COLLECTIONS.DRAFTS)
      .where('recordId', '==', recordId)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = {
  CareerRecordService,
  MatchService,
  DraftService,
  COLLECTIONS,
  ForbiddenError,
  assertOwner,
};
