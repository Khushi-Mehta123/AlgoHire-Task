type Alert = {
  id: number;
  sensor_id: string;
  status: "open" | "acknowledged" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  opened_at: string;
  escalated: boolean;
};

interface Props {
  alerts: Alert[];
  onTransition: (id: number, action: "ack" | "resolve") => Promise<void>;
}

export default function AlertPanel({ alerts, onTransition }: Props) {
  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-mist">Open Alerts</h2>
        <span className="text-xs text-slate-400">Lifecycle controls</span>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && <p className="text-sm text-slate-400">No alerts in current zone.</p>}

        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-white">{alert.title}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-md bg-slate-700 px-2 py-1 uppercase text-mist">{alert.status}</span>
                <span className="rounded-md bg-pop/20 px-2 py-1 uppercase text-pop">{alert.severity}</span>
              </div>
            </div>
            <p className="text-sm text-slate-300">{alert.description}</p>
            <p className="mt-2 text-xs text-slate-500">Sensor: {alert.sensor_id}</p>
            <p className="text-xs text-slate-500">Opened: {new Date(alert.opened_at).toLocaleString()}</p>
            {alert.escalated && <p className="mt-1 text-xs font-semibold text-bad">Escalated</p>}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void onTransition(alert.id, "ack")}
                disabled={alert.status !== "open"}
                className="rounded-lg bg-warn/80 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                Acknowledge
              </button>
              <button
                onClick={() => void onTransition(alert.id, "resolve")}
                disabled={alert.status === "resolved"}
                className="rounded-lg bg-ok/80 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                Resolve
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
