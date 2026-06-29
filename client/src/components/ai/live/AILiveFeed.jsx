import { useEffect, useState } from "react";

export default function AILiveFeed() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const eventTypes = [
        "AI_ALERT",
        "VAT_UPDATED",
        "CASHFLOW_UPDATED"
      ];

      const newEvent = {
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        message: "Live financial event detected",
        time: new Date().toLocaleTimeString()
      };

      setLogs(prev => [newEvent, ...prev].slice(0, 6));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
      <div className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">
        AI Live Financial Stream (UI-4B)
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {logs.map((l, i) => (
          <div key={i} className="flex justify-between text-sky-900 dark:text-sky-100">
            <span>{l.type}: {l.message}</span>
            <span className="text-xs opacity-60">{l.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
