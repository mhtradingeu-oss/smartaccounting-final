import React, { useEffect, useState } from 'react';

export default function DLQPanel() {
  const [dlq, setDlq] = useState([]);

  useEffect(() => {
    fetch('/api/enterprise/observability/dlq')
      .then(res => res.json())
      .then(data => setDlq(data.failedJobs || []));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>💀 Dead Letter Queue</h2>

      {dlq.length === 0 ? (
        <p>No failed jobs</p>
      ) : (
        <ul>
          {dlq.map((job, i) => (
            <li key={i}>
              <b>{job.queue}</b> — {job.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
