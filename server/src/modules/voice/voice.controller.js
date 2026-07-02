const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const TenantContext = require('../../core/tenant/tenant.context');
const { processSafePipeline } = require('./engine/safe.pipeline');

async function processVoice(req, res) {
  try {

    const tenant = TenantContext.resolve(req);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // 🎤 Whisper STT
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path));
    form.append('model', 'whisper-1');

    const whisper = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
      },
    );

    const transcript = whisper.data.text;

    // 🛡 SAFE PIPELINE (NEW ACTIVE SYSTEM)
    const result = await processSafePipeline(transcript, tenant);

    return res.json(result);

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

module.exports = { processVoice };
