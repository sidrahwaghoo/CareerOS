const { DraftService, CareerRecordService, MatchService, UserService } = require('../services/firestoreService');
const { PDFService } = require('../services/pdfService');

const draftService = new DraftService();
const careerRecordService = new CareerRecordService();
const matchService = new MatchService();
const userService = new UserService();
const pdfService = new PDFService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const exportController = {
  async approve(req, res) {
    try {
      const { draftId } = req.body;
      const userId = req.user.uid;

      if (!draftId) {
        return res.status(400).json({ error: 'draftId is required' });
      }

      const draft = await draftService.get(draftId, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      // Keep approval history consistent across every approval path (HI-01).
      const approvalHistory = Array.isArray(draft.approvalHistory)
        ? draft.approvalHistory.slice()
        : [];
      approvalHistory.push({
        action: 'approve',
        actor: userId,
        timestamp: new Date().toISOString(),
        recordVersion: draft.recordVersion,
        source: 'career-studio',
      });

      const updated = await draftService.update(draftId, {
        status: 'approved',
        approvedAt: new Date(),
        approvalHistory,
      }, userId);

      res.json(updated);
    } catch (err) {
      handleError(res, err);
    }
  },

  async pdf(req, res) {
    try {
      const { draftId, template = 'modern' } = req.body;
      const userId = req.user.uid;

      if (!draftId) {
        return res.status(400).json({ error: 'draftId is required' });
      }

      const draft = await draftService.get(draftId, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const record = await careerRecordService.get(draft.recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const pdfBuffer = await pdfService.generateResume(draft.content, record, { template });

      // Track SaaS export metric
      await userService.recordUsage(userId, 'exports').catch(() => null);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="resume_${(record.personalInfo?.name || 'candidate').replace(/\s+/g, '_')}_${template}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF export error:', err);
      handleError(res, err);
    }
  },

  async coverLetter(req, res) {
    try {
      const { draftId } = req.body;
      const userId = req.user.uid;

      if (!draftId) {
        return res.status(400).json({ error: 'draftId is required' });
      }

      const draft = await draftService.get(draftId, userId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const record = await careerRecordService.get(draft.recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const pdfBuffer = await pdfService.generateCoverLetter(draft.content, record);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cover_letter_${(record.personalInfo?.name || 'candidate').replace(/\s+/g, '_')}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Cover letter export error:', err);
      handleError(res, err);
    }
  },

  async json(req, res) {
    try {
      const { recordId } = req.params;
      const userId = req.user.uid;

      const record = await careerRecordService.get(recordId, userId);
      if (!record) return res.status(404).json({ error: 'Career record not found' });

      const [matches, drafts] = await Promise.all([
        matchService.listByRecord(recordId, userId),
        draftService.listByRecord(recordId, userId),
      ]);

      res.json({ record, matches, drafts });
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = exportController;
