const express = require('express');
const router = express.Router();
const controller = require('../controllers/draftController');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

// Specific routes MUST come before /:id
router.get('/record/:recordId', controller.listByRecord);
// PRD HI-01 approval routes (mounted at both /api/draft and /api/drafts)
router.post('/:id/approve', validateParams(schemas.draftIdParamSchema), controller.approve);
router.post('/:id/reject', validateParams(schemas.draftIdParamSchema), controller.reject);
router.post('/', validateBody(schemas.draftRequestSchema), controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);

module.exports = router;
