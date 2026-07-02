import AIControlRouter from './ai/orchestratorBridge/AIControlRouter';

export const aiAssistantAPI = {

  askIntent: (p) => AIControlRouter.askIntent(p),
  askIntentStream: (p) => AIControlRouter.askIntentStream(p),
  startSession: (p) => AIControlRouter.startSession(p),
  getContext: (p) => AIControlRouter.getContext(p),

};

export default aiAssistantAPI;
