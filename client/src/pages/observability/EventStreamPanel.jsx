import React, { useEffect, useState } from 'react';

export default function EventStreamPanel() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/enterprise/observability/events?entityType=ApprovalQueue')
      .then(res => res.json())
      .then(data => setEvents(data.events || []));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📡 Event Stream</h2>

      {events.map((e, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <b>{e.type}</b>
          <div>{e.timestamp}</div>
        </div>
      ))}
    </div>
  );
}
