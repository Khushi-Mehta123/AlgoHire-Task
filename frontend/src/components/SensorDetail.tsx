type Reading = {
  id: number;
  reading_at: string;
  metric_value: number;
  anomaly_triggered: boolean;
  anomalies: Array<{
    anomalyId: number;
    type: string;
    severity: string;
    suppressed: boolean;
    message: string;
    alertId: number | null;
  }>;
};

type HistoryPayload = {
  page: number;
  pageSize: number;
  total: number;
  suppression: {
    id: number;
    start_time: string;
    end_time: string;
    reason: string | null;
  } | null;
  data: Reading[];
};

interface Props {
  sensorId: string | null;
  history: HistoryPayload | null;
}

export default function SensorDetail({ sensorId, history }: Props) {
  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-mist">Sensor Detail</h2>
        <span className="text-xs text-slate-400">Recent readings + anomalies</span>
      </div>

      {!sensorId && <p className="text-sm text-slate-400">Select a sensor to view details.</p>}

      {sensorId && history && (
        <div>
          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-sm text-white">Sensor: {sensorId}</p>
            <p className="text-xs text-slate-400">
              Active suppression: {history.suppression ? "Yes" : "No"}
            </p>
            {history.suppression && (
              <p className="text-xs text-slate-400">
                Window: {new Date(history.suppression.start_time).toLocaleString()} - {" "}
                {new Date(history.suppression.end_time).toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {history.data.map((reading) => (
              <article key={reading.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-white">Value: {reading.metric_value}</p>
                  <span className={`text-xs font-semibold ${reading.anomaly_triggered ? "text-bad" : "text-ok"}`}>
                    {reading.anomaly_triggered ? "Anomaly" : "Normal"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{new Date(reading.reading_at).toLocaleString()}</p>
                {reading.anomalies.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {reading.anomalies.map((a) => (
                      <p key={a.anomalyId} className="text-xs text-slate-300">
                        {a.type} [{a.severity}] | suppressed={String(a.suppressed)} | alert={a.alertId ?? "none"}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
