const { MatchService, CareerRecordService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const matchService = new MatchService();
const careerRecordService = new CareerRecordService();
const geminiService = new GeminiService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const matchController = {
  async create(req, res) {
    try {
      const { recordId, jobDescription } = req.body;
      const userId = req.user.uid;

      if (!recordId || !jobDescription) {
        return res.status(400).json({ error: 'recordId and jobDescription are required' });
      }

      // Ownership is enforced by the service: a record owned by another user
      // resolves to 404 here, never exposes its data to the match agent.
      const record = await careerRecordService.get(recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const matchResult = await geminiService.match(record, jobDescription);

      // PRD data model: expose a nested jdParsed object built from the flat
      // fields returned by the Match agent. Flat fields are kept as-is for
      // backwards compatibility with existing clients.
      const jdParsed = {
        requiredSkills: Array.isArray(matchResult.jdRequiredSkills)
          ? matchResult.jdRequiredSkills
          : [],
        preferredSkills: Array.isArray(matchResult.jdPreferredSkills)
          ? matchResult.jdPreferredSkills
          : [],
        responsibilities: Array.isArray(matchResult.jdResponsibilities)
          ? matchResult.jdResponsibilities
          : [],
        experienceLevel: matchResult.jdExperienceLevel || '',
      };

      const saved = await matchService.create({
        recordId,
        recordVersion: record.version,
        jdText: jobDescription,
        ...matchResult,
        jdParsed,
      }, userId);

      res.status(201).json(saved);
    } catch (err) {
      console.error('Match error:', err);
      handleError(res, err);
    }
  },

  async get(req, res) {
    try {
      const match = await matchService.get(req.params.id, req.user.uid);
      if (!match) return res.status(404).json({ error: 'Match not found' });
      res.json(match);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listByRecord(req, res) {
    try {
      const { recordId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const matches = await matchService.listByRecord(recordId, req.user.uid, limit);
      res.json(matches);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = matchController;
