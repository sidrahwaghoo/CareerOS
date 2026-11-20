const express = require('express');
const router = express.Router();
const controller = require('../controllers/exportController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

router.post('/approve', validateBody(schemas.draftIdBodySchema), controller.approve);
router.post('/pdf', validateBody(schemas.draftIdBodySchema), controller.pdf);
router.post('/cover-letter', validateBody(schemas.draftIdBodySchema), controller.coverLetter);
router.get('/json/:recordId', controller.json);

module.exports = router;
