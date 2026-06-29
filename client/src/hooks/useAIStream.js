import { useEffect, useState } from 'react';

export default function useAIStream() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const es = new EventSource('http://localhost:5055/stream');

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents((prev) => [data, ...prev].slice(0, 20));
    };

    es.onerror = () => {
      console.log('AI stream disconnected');
      es.close();
    };

    return () => es.close();
  }, []);

  return events;
}
