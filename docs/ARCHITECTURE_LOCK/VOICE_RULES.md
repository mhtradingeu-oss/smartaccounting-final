# VOICE ARCHITECTURE RULES (STRICT)

## RULE 1
Voice system is INPUT ONLY

## RULE 2
No AI decision is allowed inside:
- server/src/modules/voice

## RULE 3
All intents must go through:
src/services/ai/orchestrator

## RULE 4
Execution is forbidden inside voice layer

## RULE 5
Voice is allowed to:
- transcribe
- normalize text
- forward request
