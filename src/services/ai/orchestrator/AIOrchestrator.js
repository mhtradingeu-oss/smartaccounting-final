// 🧠 AI CONTROL PLANE - MASTER ORCHESTRATOR

const aiReadGateway = require('../aiReadGateway');
const aiInsightsService = require('../aiInsightsService');
const aiAssistantService = require('../aiAssistantService');
const automationEngine = require('../automation/automationEngine');
const cfoEngine = require('../cfo/cfoEngine');

const { validateAssistantResponse } = require('../assistantResponseSchema');
const { validateSuggestionContract } = require('../suggestionContract');

async function AIOrchestrator(request) {
  request.context = request.context || {};
  request.payload = request.payload || {};

  try {
    const { type, payload, context } = request;

    // 🧠 1. ROUTING DECISION LAYER
    let result;

    switch (type) {
      case 'assistant':
        {
          const intent = payload.intent;
          const prompt = payload.prompt || payload.input || '';
          const targetInsightId = payload.targetInsightId;
          const companyId = context.companyId;

          if (!intent) {
            throw new Error('intent is required');
          }

          if (!aiAssistantService.INTENT_LABELS[intent]) {
            throw new Error('Intent not supported');
          }

          const assistantContext = payload.context || await aiAssistantService.getContext(companyId);

          result = {
            success: true,
            type: 'assistant',
            data: await aiAssistantService.answerIntentComplianceWithProvider({
              intent,
              context: assistantContext,
              targetInsightId,
              prompt,
              requestId: context.requestId,
            }),
          };
        }
        break;

      case 'insight':
        result = await aiInsightsService.generate(payload, context);
        break;

      case 'automation':
        result = await automationEngine.execute(payload, context);
        break;

      case 'finance':
        result = await cfoEngine.analyze(payload, context);
        break;

      case 'read':
      default:
        result = await aiReadGateway({ payload, context });
        break;
    }

    // 🧠 2. CONTRACT VALIDATION LAYER
    if (result?.type === 'assistant') {
      validateAssistantResponse(result.data);
    }

    if (result?.type === 'suggestion') {
      validateSuggestionContract(result.data);
    }

    // 🧠 3. EXPLAINABILITY ATTACHMENT
    result.meta = {
      orchestrated: true,
      timestamp: new Date().toISOString(),
      route: type,
    };

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      meta: {
        orchestrated: true,
        failed: true,
      },
    };
  }
}

module.exports = AIOrchestrator;
