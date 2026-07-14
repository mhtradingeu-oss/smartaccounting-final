
const AuditLogService = require('../../../auditLogService');
const DeadLetterQueue = require('../../dlq/deadLetterQueue');
const EventStoreService = require('../../event-store/eventStore.service');
const { buildGraph } = require('../../../audit/graph/TimelineGraphEngine');

/**
 * ENTERPRISE OBSERVABILITY API
 */

class ObservabilityController {

  /**
   * SYSTEM HEALTH SNAPSHOT
   */
  static async getSystemHealth(req, res) {
    try {

      const logs = await AuditLogService.exportLogs?.({ limit: 100 }) || [];

      const dlq = DeadLetterQueue.getAll();

      const graph = await buildGraph(req.companyId);

      return res.json({
        success: true,
        metrics: {
          totalLogs: logs.length,
          dlqCount: dlq.length,
          graphNodes: graph.nodes.length,
          graphEdges: graph.edges.length,
        },
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * LIVE EVENT STREAM
   */
  static async getEventStream(req, res) {
    try {

      const events = await EventStoreService.replay(
        req.query.entityType,
        req.query.entityId,
        req.companyId,
      );

      return res.json({
        success: true,
        events,
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * DLQ INSPECTOR
   */
  static async getDLQ(req, res) {
    try {

      const dlq = DeadLetterQueue.getAll();

      return res.json({
        success: true,
        failedJobs: dlq,
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

}

module.exports = ObservabilityController;
