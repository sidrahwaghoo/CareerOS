const express = require('express');
const router = express.Router();
const controller = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', controller.message);

module.exports = router;
