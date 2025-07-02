const express = require('express');
const router = express.Router();
const { handlePrompt } = require('../controllers/promptController');

// Ruta POST /api/prompt
router.post('/', handlePrompt);

module.exports = router;
