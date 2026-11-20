const express = require('express');
const router = express.Router();
const controller = require('../controllers/careerRecordController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { schemas } = require('../schemas');

router.use(requireAuth);

router.post('/', validateBody(schemas.careerRecordSchema), controller.create);
router.get('/', controller.list);
// Must be declared before /:id so it is not captured as a record id.
router.get('/me', controller.me);
router.get('/:id', controller.get);
router.post('/:id/dna', controller.getDNA);
router.put('/:id', validateBody(schemas.careerRecordSchema), controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
