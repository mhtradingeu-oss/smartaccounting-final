
const { AIInsight, AIInsightDecision, Company } = require('../../models');
const { logAIEvent } = require('./auditLogger');
const { detectInvoiceAnomaly } = require('./insightTypes');

const ALLOWED_DECISIONS = ['accepted', 'rejected', 'overridden'];

async function generateInsightsForCompany(companyId, context = {}) {
  // Example: generate insights for all invoices/expenses (expand as needed)
  // context: { invoices, expenses, ... }
  const company = await Company.findByPk(companyId);
  if (!company || company.aiEnabled === false) {
    throw Object.assign(new Error('AI disabled'), { status: 501 });
  }

  const insights = [];
  // ...deterministic logic, e.g.:
  for (const invoice of context.invoices || []) {
    const anomaly = detectInvoiceAnomaly(invoice, context.invoices);
    if (anomaly) {
      const insight = await AIInsight.create({
        companyId,
        entityType: 'invoice',
        entityId: invoice.id,
        type: anomaly.type,
        severity: 'medium',
        confidenceScore: anomaly.explainability.confidence,
        summary: anomaly.explainability.why,
        why: anomaly.explainability.why,
        legalContext: anomaly.explainability.legalContext,
        evidence: anomaly.explainability.dataPoints,
        ruleId: anomaly.explainability.ruleOrModel,
        modelVersion: 'v1',
        featureFlag: 'default',
        disclaimer: 'Suggestion only — not binding',
      });
      await logAIEvent({ entityType: 'invoice', entityId: invoice.id, action: 'AI_SUGGEST', aiOutput: insight, userId: 0, aiVersion: 'v1' });
      insights.push(insight);
    }
  }
  // ...repeat for other entity types
  return insights;
}

async function listInsights(companyId, filters = {}) {
  return AIInsight.findAll({
    where: { companyId, ...filters },
    include: [{ model: AIInsightDecision, as: 'decisions' }],
    order: [['createdAt', 'DESC']],
  });
}

async function decideInsight(companyId, insightId, actorUser, decision, reason) {
  // Validate input first, before checking aiEnabled
  if (!ALLOWED_DECISIONS.includes(decision)) {
    throw Object.assign(new Error('Invalid decision'), { status: 400 });
  }
  if ((decision === 'rejected' || decision === 'overridden') && !reason) {
    throw Object.assign(new Error('Reason required'), { status: 400 });
  }
  if (actorUser.role === 'viewer') {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  const insight = await AIInsight.findOne({ where: { id: insightId, companyId } });
  if (!insight) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
  // Only admin can override
  if (decision === 'overridden' && actorUser.role !== 'admin') {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  // Check if AI is enabled for the company (after input validation)
  const company = await Company.findByPk(companyId);
  if (!company || company.aiEnabled === false) {
    throw Object.assign(new Error('AI disabled'), { status: 501 });
  }
  const decisionObj = await AIInsightDecision.create({
    insightId,
    companyId,
    actorUserId: actorUser.id,
    decision,
    reason,
  });
  await logAIEvent({ entityType: 'ai_insight', entityId: insightId, action: `USER_${decision.toUpperCase()}`, aiOutput: insight, userId: actorUser.id, aiVersion: insight.modelVersion, reason });
  return decisionObj;
}

async function exportInsights(companyId, format = 'json') {
  const insights = await AIInsight.findAll({
    where: { companyId },
    include: [{ model: AIInsightDecision, as: 'decisions' }],
    order: [['createdAt', 'DESC']],
  });
  if (format === 'csv') {
    // Flatten for CSV
    const header = [
      'id','entityType','entityId','type','severity','confidenceScore','summary','why','legalContext','ruleId','modelVersion','featureFlag','createdAt','decision','decisionReason','decisionActorUserId','decisionCreatedAt',
    ];
    const rows = insights.map(i => {
      const d = (i.decisions && i.decisions[0]) || {};
      return [
        i.id, i.entityType, i.entityId, i.type, i.severity, i.confidenceScore, i.summary, i.why, i.legalContext, i.ruleId, i.modelVersion, i.featureFlag, i.createdAt,
        d.decision || '', d.reason || '', d.actorUserId || '', d.createdAt || '',
      ].map(x => (x === null || x === undefined) ? '' : String(x).replace(/\n/g, ' '));
    });
    return header.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
  }
  // JSON
  return insights.map(i => i.toJSON());
}

module.exports = {
  generateInsightsForCompany,
  listInsights,
  decideInsight,
  exportInsights,
};
