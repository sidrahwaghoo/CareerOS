const { InterviewService, CareerRecordService, MatchService, UserService } = require('../services/firestoreService');
const { GeminiService } = require('../services/geminiService');

const interviewService = new InterviewService();
const careerRecordService = new CareerRecordService();
const matchService = new MatchService();
const userService = new UserService();
const geminiService = new GeminiService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const interviewController = {
  async generate(req, res) {
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

      const prep = await geminiService.interviewPrep(record, match, jobDescription);

      const saved = await interviewService.create({
        recordId,
        matchId,
        jobDescription,
        ...prep,
      }, userId);

      await userService.recordUsage(userId, 'interviews').catch(() => null);

      res.status(201).json(saved);
    } catch (err) {
      console.error('Interview prep error:', err);
      handleError(res, err);
    }
  },

  async get(req, res) {
    try {
      const item = await interviewService.get(req.params.id, req.user.uid);
      if (!item) return res.status(404).json({ error: 'Interview prep session not found' });
      res.json(item);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listByRecord(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const list = await interviewService.listByRecord(req.params.recordId, req.user.uid, limit);
      res.json(list);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = interviewController;
