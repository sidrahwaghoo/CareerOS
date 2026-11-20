const express = require('express');
const router = express.Router();
const controller = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

router.post('/', validateBody(schemas.reviewRequestSchema), controller.create);
router.get('/:id', controller.get);

module.exports = router;
