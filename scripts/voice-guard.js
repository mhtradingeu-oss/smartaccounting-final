const fs = require('fs');

let failed = false;

function fail(message) {
console.error('VOICE GUARD FAIL: ' + message);
failed = true;
}

const app = fs.readFileSync('src/app.js', 'utf8');
const aiIndex = fs.readFileSync('src/routes/ai/index.js', 'utf8');
const voice = fs.readFileSync('src/routes/ai/voice.js', 'utf8');

if (!aiIndex.includes("router.use('/voice', voiceRouter)")) {
fail('official /api/ai/voice mount missing from src/routes/ai/index.js');
}

if (app.includes('${EXPRESS_API_PREFIX}/voice')) {
fail('duplicate /api/voice mount must not exist in src/app.js');
}

if (voice.includes('safe.pipeline') || voice.includes('intent.engine') || voice.includes('safeExecutor')) {
fail('voice route must not use legacy execution pipeline');
}

if (!voice.includes('aiReadGateway')) {
fail('voice route must go through aiReadGateway');
}

if (!voice.includes('answerIntentComplianceWithProvider')) {
fail('voice route must use assistant compliance provider flow');
}

if (!fs.existsSync('docs/ARCHITECTURE_LOCK/VOICE_SOURCE_OF_TRUTH.md')) {
fail('voice source of truth document missing');
}

if (failed) {process.exit(1);}

console.log('VOICE GUARD PASS: voice is locked to /api/ai/voice and safe assistant flow.');
