const express = require('express');
const router = express.Router();
const { handlePrompt } = require('../controllers/promptController');
const multer = require('multer');

const storage = multer.memoryStorage(); // para no guardar archivos en disco
const upload = multer({ storage });

router.post('/', upload.single('archivo'), handlePrompt);

module.exports = router;
