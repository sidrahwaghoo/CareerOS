const express = require('express');
const router = express.Router();
const controller = require('../controllers/matchController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

// Specific routes MUST come before /:id
router.get('/record/:recordId', controller.listByRecord);
router.post('/', validateBody(schemas.matchRequestSchema), controller.create);
router.get('/:id', controller.get);

module.exports = router;
