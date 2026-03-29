type Sensor = {
  id: string;
  zone_id: string;
  name: string;
  status: "healthy" | "warning" | "offline";
  last_seen_at: string | null;
};

interface Props {
  sensors: Sensor[];
  selectedSensorId: string | null;
  onSelect: (sensorId: string) => void;
}

function statusClass(status: Sensor["status"]): string {
  if (status === "healthy") return "bg-ok/20 text-ok border-ok/50";
  if (status === "warning") return "bg-warn/20 text-warn border-warn/50";
  return "bg-bad/20 text-bad border-bad/50";
}

export default function SensorGrid({ sensors, selectedSensorId, onSelect }: Props) {
  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-mist">Sensors</h2>
        <span className="text-xs text-slate-400">Zone-scoped live status</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sensors.map((sensor) => (
          <button
            key={sensor.id}
            onClick={() => onSelect(sensor.id)}
            className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-pop/70 ${
              selectedSensorId === sensor.id ? "border-pop bg-slate-800" : "border-slate-700 bg-slate-900/70"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-white">{sensor.name}</h3>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusClass(sensor.status)}`}>
                {sensor.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">ID: {sensor.id}</p>
            <p className="mt-1 text-xs text-slate-400">
              Last seen: {sensor.last_seen_at ? new Date(sensor.last_seen_at).toLocaleString() : "never"}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
