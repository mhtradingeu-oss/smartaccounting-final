import useAIStream from '../../../hooks/useAIStream';

export default function AILiveStreamBridge() {
  const events = useAIStream();

  return (
    <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20">
      <div className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-300">
        UI-4C LIVE AI STREAM (REAL BACKEND)
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {events.map((e, i) => (
          <div key={i} className="flex justify-between text-cyan-900 dark:text-cyan-100">
            <span>{e.type || 'event'}: {e.message}</span>
            <span className="text-xs opacity-60">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
