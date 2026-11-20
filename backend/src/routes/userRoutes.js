const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/profile', controller.getProfile);
router.post('/tier', controller.updateTier);

module.exports = router;
