import { useEffect, useState } from "react";

export default function AIStreamEngine() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = {
        time: new Date().toISOString(),
        message: [
          "Cashflow updated",
          "VAT signal recalculated",
          "Invoice anomaly scan complete",
          "Expense pattern re-evaluated"
        ][Math.floor(Math.random() * 4)]
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 5));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
      <div className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">
        AI Live Financial Stream
      </div>

      <div className="mt-3 space-y-2 text-sm text-sky-900 dark:text-sky-100">
        {events.map((e, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span>{e.message}</span>
            <span className="text-xs opacity-60">{e.time.slice(11,19)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
