const { DraftService, CareerRecordService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const draftService = new DraftService();
const careerRecordService = new CareerRecordService();
const geminiService = new GeminiService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const reviewController = {
  async create(req, res) {
    try {
      const { draftId, jobDescription } = req.body;
      const userId = req.user.uid;

      if (!draftId || !jobDescription) {
        return res.status(400).json({ error: 'draftId and jobDescription are required' });
      }

      const draft = await draftService.get(draftId, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const record = await careerRecordService.get(draft.recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const reviewResult = await geminiService.review(draft.content, jobDescription, record);

      // Update draft with review result (still scoped to the owning user).
      const updated = await draftService.update(draftId, {
        reviewResult,
        status: 'edited',
      }, userId);

      res.json({ ...updated, reviewResult });
    } catch (err) {
      console.error('Review error:', err);
      handleError(res, err);
    }
  },

  async get(req, res) {
    try {
      const draft = await draftService.get(req.params.id, req.user.uid);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      res.json({ reviewResult: draft.reviewResult || null });
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = reviewController;
