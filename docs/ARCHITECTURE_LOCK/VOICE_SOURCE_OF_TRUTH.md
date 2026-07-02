# Voice Source of Truth — SmartAccounting

## Official voice route

Voice assistant route is:

```text
/api/ai/voice/assistant

It is mounted through:

src/routes/ai/index.js
→ src/routes/ai/voice.js
Voice rules

Voice is an input layer only.

Allowed:

transcript / prompt input
safe assistant answer
text response mode
optional voice response mode only when TTS is explicitly enabled

Forbidden:

legacy server voice runtime
direct accounting execution inside voice
old intent engine
old safe pipeline
duplicate AI brain
Legacy paths

These are not official runtime paths:

server/src/modules/voice/*
server/src/modules/ai-brain/*
server/index.js
server/src/app.js

