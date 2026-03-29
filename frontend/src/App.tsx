import { useEffect, useMemo, useState } from "react";
import AlertPanel from "./components/AlertPanel";
import SensorDetail from "./components/SensorDetail";
import SensorGrid from "./components/SensorGrid";
import { apiGet, apiPost, createEventsStream, operator } from "./lib/api";

type Sensor = {
  id: string;
  zone_id: string;
  name: string;
  status: "healthy" | "warning" | "offline";
  last_seen_at: string | null;
};

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
  data: Array<{
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
  }>;
};

export default function App() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSensor = useMemo(
    () => sensors.find((item) => item.id === selectedSensorId) ?? null,
    [sensors, selectedSensorId]
  );

  async function refreshSensors() {
    const payload = await apiGet<{ data: Sensor[] }>("/sensors");
    setSensors(payload.data);
    if (!selectedSensorId && payload.data.length > 0) {
      setSelectedSensorId(payload.data[0].id);
    }
  }

  async function refreshAlerts() {
    const payload = await apiGet<{ data: Alert[] }>("/alerts?page=1&pageSize=100&status=open");
    setAlerts(payload.data);
  }

  async function refreshHistory(sensorId: string) {
    const payload = await apiGet<HistoryPayload>(`/sensors/${sensorId}/history?page=1&pageSize=100`);
    setHistory(payload);
  }

  async function load() {
    try {
      setError(null);
      await Promise.all([refreshSensors(), refreshAlerts()]);
    } catch (err) {
      setError(String(err));
    }
  }

  async function transitionAlert(id: number, action: "ack" | "resolve") {
    if (action === "ack") {
      await apiPost(`/alerts/${id}/acknowledge`);
    } else {
      await apiPost(`/alerts/${id}/resolve`);
    }
    await refreshAlerts();
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedSensorId) return;
    void refreshHistory(selectedSensorId);
  }, [selectedSensorId]);

  useEffect(() => {
    const source = createEventsStream((event) => {
      if (event.type === "sensor.updated") {
        void refreshSensors();
      }

      if (event.type === "alert.updated") {
        void refreshAlerts();
      }

      if (event.type === "anomaly.created" && selectedSensorId) {
        void refreshHistory(selectedSensorId);
      }
    });

    source.onerror = () => {
      source.close();
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    return () => source.close();
  }, [selectedSensorId]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
      <header className="mb-6 panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-pop">Alogo Hire Assignment</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Real-time Sensor Operations Console</h1>
        <p className="mt-1 text-sm text-slate-300">Zone: {operator.zoneId} | Operator: {operator.operatorId}</p>
        {selectedSensor && <p className="text-xs text-slate-400">Focused sensor: {selectedSensor.name}</p>}
        {error && <p className="mt-2 rounded-md bg-bad/15 p-2 text-sm text-bad">{error}</p>}
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SensorGrid sensors={sensors} selectedSensorId={selectedSensorId} onSelect={setSelectedSensorId} />
        </div>
        <div>
          <AlertPanel alerts={alerts} onTransition={transitionAlert} />
        </div>
      </section>

      <section className="mt-4">
        <SensorDetail sensorId={selectedSensorId} history={history} />
      </section>
    </main>
  );
}
