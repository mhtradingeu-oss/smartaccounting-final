export const AIControlRouter = {

  async askIntent(params) {
    return this._request('askIntent', params);
  },

  async askIntentStream(params) {
    return this._request('askIntentStream', params);
  },

  async startSession(params) {
    return this._request('startSession', params);
  },

  async getContext(params) {
    return this._request('getContext', params);
  },

  async _request(action, params) {
    // TEMP SAFE MOCK LAYER (prevents backend coupling crash)
    return {
      action,
      params,
      status: 'MOCK_RESPONSE',
      timestamp: Date.now(),
    };
  },

};

export default AIControlRouter;
