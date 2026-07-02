# VOICE ENFORCEMENT RULE

## RULE 1
Voice must NOT perform:
- intent detection
- AI reasoning
- execution
- accounting decisions

## RULE 2
Voice is ONLY allowed to:
- transcribe audio (Whisper)
- forward text to AIOrchestrator

## RULE 3
All decisions MUST go through:
src/services/ai/orchestrator

## RULE 4
Violation = architecture break
