const { DraftService, CareerRecordService, MatchService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const draftService = new DraftService();
const careerRecordService = new CareerRecordService();
const matchService = new MatchService();
const geminiService = new GeminiService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

// Build a human-approval history entry (HI-01). The actor is the authenticated
// user's Firebase UID — it always comes from the verified token, never the body.
function buildApprovalEntry(draft, action, actor) {
  return {
    action,
    actor,
    timestamp: new Date().toISOString(),
    recordVersion: draft.recordVersion,
    source: 'career-studio',
  };
}

function appendApprovalHistory(draft, action, actor) {
  const history = Array.isArray(draft.approvalHistory) ? draft.approvalHistory.slice() : [];
  history.push(buildApprovalEntry(draft, action, actor));
  return history;
}

const draftController = {
  async create(req, res) {
    try {
      const { recordId, matchId, jobDescription } = req.body;
      const userId = req.user.uid;

      if (!recordId || !matchId || !jobDescription) {
        return res.status(400).json({ error: 'recordId, matchId, and jobDescription are required' });
      }

      const record = await careerRecordService.get(recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const match = await matchService.get(matchId, userId);
      if (!match) return res.status(404).json({ error: 'Match result not found' });

      const draftContent = await geminiService.draft(record, match, jobDescription);
      const saved = await draftService.create({
        recordId,
        recordVersion: record.version,
        matchId,
        content: draftContent,
        status: 'draft',
      }, userId);

      res.status(201).json(saved);
    } catch (err) {
      console.error('Draft error:', err);
      handleError(res, err);
    }
  },

  async get(req, res) {
    try {
      const draft = await draftService.get(req.params.id, req.user.uid);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      res.json(draft);
    } catch (err) {
      handleError(res, err);
    }
  },

  async update(req, res) {
    try {
      const draft = await draftService.update(req.params.id, req.body, req.user.uid);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      res.json(draft);
    } catch (err) {
      handleError(res, err);
    }
  },

  // PRD HI-01: POST /api/drafts/:id/approve
  async approve(req, res) {
    try {
      const userId = req.user.uid;
      const draft = await draftService.get(req.params.id, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const updated = await draftService.update(req.params.id, {
        status: 'approved',
        approvedAt: new Date(),
        approvalHistory: appendApprovalHistory(draft, 'approve', userId),
      }, userId);

      res.json(updated);
    } catch (err) {
      console.error('Draft approve error:', err);
      handleError(res, err);
    }
  },

  // PRD HI-01: POST /api/drafts/:id/reject
  async reject(req, res) {
    try {
      const userId = req.user.uid;
      const draft = await draftService.get(req.params.id, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const updated = await draftService.update(req.params.id, {
        status: 'rejected',
        approvalHistory: appendApprovalHistory(draft, 'reject', userId),
      }, userId);

      res.json(updated);
    } catch (err) {
      console.error('Draft reject error:', err);
      handleError(res, err);
    }
  },

  async listByRecord(req, res) {
    try {
      const { recordId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const drafts = await draftService.listByRecord(recordId, req.user.uid, limit);
      res.json(drafts);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = draftController;
