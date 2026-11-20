const express = require('express');
const router = express.Router();
const controller = require('../controllers/interviewController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

router.post('/', validateBody(schemas.interviewRequestSchema), controller.generate);
router.get('/:id', controller.get);
router.get('/record/:recordId', controller.listByRecord);

module.exports = router;
