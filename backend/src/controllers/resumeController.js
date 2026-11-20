const { parseResume, extractCareerFieldsWithAI } = require('../services/resumeParser');
const { UserService } = require('../services/firestoreService');

const userService = new UserService();

const resumeController = {
  /**
   * Parse an uploaded resume file and return extracted fields.
   * Powered by Gemini AI extraction with regex heuristic fallback.
   */
  async parse(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No resume file uploaded' });
      }

      const { buffer, mimetype, originalname } = req.file;

      const text = await parseResume(buffer, mimetype, originalname);
      const fields = await extractCareerFieldsWithAI(text);

      // Record SaaS usage
      if (req.user?.uid) {
        await userService.recordUsage(req.user.uid, 'resumesParsed').catch(() => null);
      }

      res.status(200).json({
        text, // Raw extracted text for candidate review
        ...fields, // Parsed structured fields
      });
    } catch (err) {
      console.error('Resume parse error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Failed to parse resume' });
    }
  },
};

module.exports = resumeController;
