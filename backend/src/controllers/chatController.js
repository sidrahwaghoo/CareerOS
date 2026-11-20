const { CareerRecordService, UserService } = require('../services/firestoreService');
const { CopilotService } = require('../services/copilotService');

const careerRecordService = new CareerRecordService();
const userService = new UserService();
const copilotService = new CopilotService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const chatController = {
  async message(req, res) {
    try {
      const { messages, recordId, context } = req.body;
      const userId = req.user.uid;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      let careerRecord = null;
      if (recordId) {
        careerRecord = await careerRecordService.get(recordId, userId);
      } else {
        const records = await careerRecordService.list(userId, 1);
        if (records && records.length > 0) {
          careerRecord = records[0];
        }
      }

      const response = await copilotService.chat(messages, careerRecord, context || {});

      // Record SaaS usage
      await userService.recordUsage(userId, 'matches').catch(() => null);

      res.json(response);
    } catch (err) {
      console.error('Copilot chat error:', err);
      handleError(res, err);
    }
  },
};

module.exports = chatController;
