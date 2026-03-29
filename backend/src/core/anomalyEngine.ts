import { createOrUpdateAlertForAnomaly } from "./alertService.js";
import { eventBus } from "./events.js";
import type { AnomalyType, Severity } from "../types.js";
import { ReadingModel } from "../models/Reading.js";
import { SensorModel } from "../models/Sensor.js";
import { SuppressionModel } from "../models/Suppression.js";
import { AnomalyModel } from "../models/Anomaly.js";
import { NotificationModel } from "../models/Notification.js";

function severityFor(type: AnomalyType, metricValue: number): Severity {
  if (type === "pattern_absence") return "high";
  if (type === "threshold_breach") return metricValue > 140 ? "critical" : "high";
  return "medium";
}

async function isSuppressed(sensorId: string, zoneId: string, atIso: string): Promise<boolean> {
  const result = await SuppressionModel.exists({
    sensorId,
    zoneId,
    startTime: { $lte: new Date(atIso) },
    endTime: { $gte: new Date(atIso) }
  });

  return Boolean(result);
}

async function createAnomaly(params: {
  readingId: string | null;
  sensorId: string;
  zoneId: string;
  type: AnomalyType;
  message: string;
  metricValue: number;
  createdAt: string;
}) {
  const suppressed = await isSuppressed(params.sensorId, params.zoneId, params.createdAt);
  const severity = severityFor(params.type, params.metricValue);
  let alertId: string | null = null;

  if (!suppressed) {
    const alert = await createOrUpdateAlertForAnomaly({
      sensorId: params.sensorId,
      zoneId: params.zoneId,
      severity,
      title: `Anomaly on sensor ${params.sensorId}`,
      description: params.message,
      anomalyAt: params.createdAt
    });

    alertId = alert._id.toString();
  }

  const inserted = await AnomalyModel.create({
    readingId: params.readingId,
    sensorId: params.sensorId,
    zoneId: params.zoneId,
    type: params.type,
    severity,
    message: params.message,
    suppressed,
    alertId
  });

  if (!suppressed && alertId) {
    await NotificationModel.create({
      anomalyId: inserted._id,
      alertId,
      zoneId: params.zoneId,
      channel: "operator_ui",
      delivered: false
    });
  }

  eventBus.publish({
    type: "anomaly.created",
    zoneId: params.zoneId,
    at: new Date().toISOString(),
    data: {
      id: inserted._id.toString(),
      sensorId: inserted.sensorId,
      type: inserted.type,
      suppressed: inserted.suppressed,
      alertId: inserted.alertId ? inserted.alertId.toString() : null
    }
  });

  return inserted;
}

export async function processReading(readingId: string): Promise<void> {
  const reading = await ReadingModel.findById(readingId).lean();

  if (!reading) {
    return;
  }

  const currentValue = Number(reading.metricValue);
  const readingAt = new Date(reading.readingAt).toISOString();

  const prev = await ReadingModel.findOne({
    sensorId: reading.sensorId,
    _id: { $ne: reading._id },
    readingAt: { $lt: reading.readingAt }
  })
    .sort({ readingAt: -1 })
    .lean();

  const anomalies: Array<{ type: AnomalyType; message: string }> = [];

  if (currentValue > 100) {
    anomalies.push({
      type: "threshold_breach",
      message: `Threshold breach: value ${currentValue} > 100`
    });
  }

  if (prev) {
    const previousValue = Number(prev.metricValue);
    if (Math.abs(currentValue - previousValue) > 30) {
      anomalies.push({
        type: "rapid_change",
        message: `Rapid change: previous ${previousValue}, current ${currentValue}`
      });
    }
  }

  if (anomalies.length > 0) {
    await ReadingModel.updateOne({ _id: reading._id }, { $set: { anomalyTriggered: true } });
  }

  for (const anomaly of anomalies) {
    await createAnomaly({
      readingId,
      sensorId: reading.sensorId,
      zoneId: reading.zoneId,
      type: anomaly.type,
      message: anomaly.message,
      metricValue: currentValue,
      createdAt: readingAt
    });
  }

  await SensorModel.updateOne(
    { sensorId: reading.sensorId },
    {
      $set: {
        lastSeenAt: reading.readingAt,
        status: anomalies.length > 0 ? "warning" : "healthy"
      }
    }
  );

  eventBus.publish({
    type: "sensor.updated",
    zoneId: reading.zoneId,
    at: new Date().toISOString(),
    data: {
      sensorId: reading.sensorId,
      status: anomalies.length > 0 ? "warning" : "healthy",
      lastSeenAt: reading.readingAt
    }
  });
}

export async function runPatternAbsenceSweep(): Promise<number> {
  const threshold = new Date(Date.now() - 2 * 60 * 1000);

  const silentSensors = await SensorModel.find({
    lastSeenAt: { $ne: null, $lte: threshold }
  }).lean();

  let created = 0;

  for (const sensor of silentSensors) {
    const duplicateGuard = await AnomalyModel.exists({
      sensorId: sensor.sensorId,
      type: "pattern_absence",
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    if (duplicateGuard) {
      continue;
    }

    await createAnomaly({
      readingId: null,
      sensorId: sensor.sensorId,
      zoneId: sensor.zoneId,
      type: "pattern_absence",
      message: "No readings received for more than 2 minutes",
      metricValue: 0,
      createdAt: new Date().toISOString()
    });

    await SensorModel.updateOne(
      { sensorId: sensor.sensorId },
      { $set: { status: "offline" } }
    );

    eventBus.publish({
      type: "sensor.updated",
      zoneId: sensor.zoneId,
      at: new Date().toISOString(),
      data: {
        sensorId: sensor.sensorId,
        status: "offline"
      }
    });

    created += 1;
  }

  return created;
}
