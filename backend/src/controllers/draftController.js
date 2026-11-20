const { DraftService, CareerRecordService, MatchService, UserService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const draftService = new DraftService();
const careerRecordService = new CareerRecordService();
const matchService = new MatchService();
const userService = new UserService();
const geminiService = new GeminiService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

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
      const { recordId, matchId, jobDescription, style = 'modern' } = req.body;
      const userId = req.user.uid;

      if (!recordId || !matchId || !jobDescription) {
        return res.status(400).json({ error: 'recordId, matchId, and jobDescription are required' });
      }

      const record = await careerRecordService.get(recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const match = await matchService.get(matchId, userId);
      if (!match) return res.status(404).json({ error: 'Match result not found' });

      const draftContent = await geminiService.draft(record, match, jobDescription, style);
      const saved = await draftService.create({
        recordId,
        recordVersion: record.version,
        matchId,
        style,
        content: draftContent,
        status: 'draft',
      }, userId);

      await userService.recordUsage(userId, 'drafts').catch(() => null);

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
      const draftId = req.params.id;
      const userId = req.user.uid;

      const existing = await draftService.get(draftId, userId);
      if (!existing) return res.status(404).json({ error: 'Draft not found' });

      const nextStatus = req.body.status || 'edited';
      const historyAction =
        nextStatus === 'approved'
          ? 'approve'
          : nextStatus === 'rejected'
            ? 'reject'
            : 'edit';

      const approvalHistory = appendApprovalHistory(existing, historyAction, userId);

      const updatePayload = {
        ...req.body,
        status: nextStatus,
        approvalHistory,
      };

      if (nextStatus === 'approved') {
        updatePayload.approvedAt = new Date();
      }

      const updated = await draftService.update(draftId, updatePayload, userId);
      res.json(updated);
    } catch (err) {
      console.error('Draft update error:', err);
      handleError(res, err);
    }
  },

  async approve(req, res) {
    try {
      const draftId = req.params.id;
      const userId = req.user.uid;

      const existing = await draftService.get(draftId, userId);
      if (!existing) return res.status(404).json({ error: 'Draft not found' });

      const approvalHistory = appendApprovalHistory(existing, 'approve', userId);
      const updated = await draftService.update(
        draftId,
        {
          status: 'approved',
          approvedAt: new Date(),
          approvalHistory,
        },
        userId
      );

      res.json(updated);
    } catch (err) {
      handleError(res, err);
    }
  },

  async reject(req, res) {
    try {
      const draftId = req.params.id;
      const userId = req.user.uid;

      const existing = await draftService.get(draftId, userId);
      if (!existing) return res.status(404).json({ error: 'Draft not found' });

      const approvalHistory = appendApprovalHistory(existing, 'reject', userId);
      const updated = await draftService.update(
        draftId,
        {
          status: 'rejected',
          approvalHistory,
        },
        userId
      );

      res.json(updated);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listByRecord(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const drafts = await draftService.listByRecord(req.params.recordId, req.user.uid, limit);
      res.json(drafts);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = draftController;
