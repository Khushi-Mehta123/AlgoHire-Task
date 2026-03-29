export type Severity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export type AnomalyType = "threshold_breach" | "rapid_change" | "pattern_absence";

export interface OperatorContext {
  zoneId: string;
  operatorId: string;
}

export interface IngestReading {
  sensorId: string;
  sensorName?: string;
  zoneId: string;
  readingAt: string;
  metricValue: number;
  payload?: Record<string, unknown>;
}
