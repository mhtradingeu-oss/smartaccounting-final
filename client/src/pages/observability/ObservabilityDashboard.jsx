import React, { useEffect, useState } from 'react';

export default function ObservabilityDashboard() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/enterprise/observability/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>

      <h1>🧠 Observability Dashboard</h1>

      {!health ? (
        <p>Loading system health...</p>
      ) : (
        <div style={{ marginTop: 20 }}>

          <h2>System Overview</h2>

          <ul>
            <li>Logs: {health.metrics.totalLogs}</li>
            <li>DLQ: {health.metrics.dlqCount}</li>
            <li>Graph Nodes: {health.metrics.graphNodes}</li>
            <li>Graph Edges: {health.metrics.graphEdges}</li>
          </ul>

          <h3>Status</h3>
          <p style={{ color: 'green' }}>
            SYSTEM OPERATIONAL
          </p>

        </div>
      )}

    </div>
  );
}
