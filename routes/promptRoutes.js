const express = require('express');
const router = express.Router();
const { handlePrompt } = require('../controllers/promptController');

router.post('/', handlePrompt);

module.exports = router;
