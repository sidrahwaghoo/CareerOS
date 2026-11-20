const { CareerRecordService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const careerRecordService = new CareerRecordService();
const geminiService = new GeminiService();

// Map service errors (e.g. ForbiddenError status 403) to an HTTP response.
function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const careerRecordController = {
  // GET /api/records/me — identity of the authenticated caller (from the token).
  me(req, res) {
    res.json(req.user);
  },

  async create(req, res) {
    try {
      const record = await careerRecordService.create(req.body, req.user.uid);
      res.status(201).json(record);
    } catch (err) {
      handleError(res, err);
    }
  },

  async get(req, res) {
    try {
      const record = await careerRecordService.get(req.params.id, req.user.uid);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json(record);
    } catch (err) {
      handleError(res, err);
    }
  },

  async update(req, res) {
    try {
      const record = await careerRecordService.update(req.params.id, req.body, req.user.uid);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json(record);
    } catch (err) {
      handleError(res, err);
    }
  },

  async delete(req, res) {
    try {
      const deleted = await careerRecordService.delete(req.params.id, req.user.uid);
      if (!deleted) return res.status(404).json({ error: 'Record not found' });
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  },

  async list(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const records = await careerRecordService.list(req.user.uid, limit);
      res.json(Array.isArray(records) ? records : []);
    } catch (err) {
      console.warn('List records fallback:', err.message);
      res.json([]);
    }
  },

  async getDNA(req, res) {
    try {
      const record = await careerRecordService.get(req.params.id, req.user.uid);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      const dna = await geminiService.analyzeCareerDNA(record);
      res.json(dna);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = careerRecordController;
