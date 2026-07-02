// 🧠 CONTROL PLANE BRIDGE
// This layer safely routes AI calls to AIOrchestrator WITHOUT breaking existing API

import api from '../../api';

export async function routeToOrchestrator({ type, payload, context, fallback }) {
  try {
    // 🧠 Try server orchestrator first
    const response = await api.post('/ai/orchestrator', {
      type,
      payload,
      context,
    });

    return response.data;
  } catch (error) {
    console.warn('[AIOrchestrator fallback]', error.message);

    // 🟡 fallback = old system (NO BREAK)
    if (fallback) {
      return await fallback();
    }

    return {
      success: false,
      error: error.message,
      source: 'fallback',
    };
  }
}
