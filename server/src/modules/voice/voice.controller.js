const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const TenantContext = require('../../core/tenant/tenant.context');

// ✅ FIXED PATH (correct root resolution)
const AIOrchestrator = require(
  path.resolve(__dirname, '../../../../src/services/ai/orchestrator/AIOrchestrator'),
);

async function processVoice(req, res) {
  try {

    const tenant = TenantContext.resolve(req);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // 🎤 Whisper STT ONLY
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

    // 🧠 SINGLE AI ENTRY POINT
    const result = await AIOrchestrator({
      type: 'assistant',
      payload: { input: transcript },
      context: {
        actor: { userId: tenant.userId || 1 },
        companyId: tenant.companyId,
        source: 'voice',
      },
    });

    return res.json({
      transcript,
      result,
      mode: 'VOICE_INPUT_ONLY',
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

module.exports = { processVoice };
