CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  reading_at TIMESTAMPTZ NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  anomaly_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON readings(sensor_id, reading_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_zone_time ON readings(zone_id, reading_at DESC);

CREATE TABLE IF NOT EXISTS suppressions (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_suppressions_sensor_window ON suppressions(sensor_id, start_time, end_time);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','acknowledged','resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalated_at TIMESTAMPTZ,
  last_anomaly_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_zone_status_opened ON alerts(zone_id, status, opened_at DESC);

CREATE TABLE IF NOT EXISTS anomalies (
  id BIGSERIAL PRIMARY KEY,
  reading_id BIGINT REFERENCES readings(id) ON DELETE SET NULL,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('threshold_breach','rapid_change','pattern_absence')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  message TEXT NOT NULL,
  suppressed BOOLEAN NOT NULL DEFAULT false,
  alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_sensor_created ON anomalies(sensor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ingest_queue (
  id BIGSERIAL PRIMARY KEY,
  reading_id BIGINT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_queue_status_created ON ingest_queue(status, created_at);

CREATE TABLE IF NOT EXISTS alert_transitions (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  anomaly_id BIGINT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
