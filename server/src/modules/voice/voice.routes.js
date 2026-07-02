const express = require('express');
const router = express.Router();
const { processVoice } = require('./voice.controller');

router.post('/process', processVoice);

module.exports = router;
