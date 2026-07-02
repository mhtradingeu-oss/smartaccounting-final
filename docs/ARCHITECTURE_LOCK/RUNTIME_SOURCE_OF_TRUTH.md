# SmartAccounting Runtime Source of Truth

## Active Backend Runtime
The canonical backend entrypoint is:

- server/index.js
- server/src/app.js

## Active AI Runtime
The active AI brain path is:

voice.controller.js
→ safe.pipeline.js
→ intent.engine.js
→ ai-brain/llm/brain.llm.js
→ safeExecutor
→ executor

## Legacy Backend
The root-level src/ directory is legacy/test-era backend code.
It must not be used as the production/dev runtime entrypoint.

Do not start:
- node src/server.js
- node src/app.js

Use only:
- npm start
- npm run dev
- node server/index.js
