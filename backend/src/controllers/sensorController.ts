import type { Request, Response } from "express";
import { SensorModel } from "../models/Sensor.js";
import { ReadingModel } from "../models/Reading.js";
import { AnomalyModel } from "../models/Anomaly.js";
import { SuppressionModel } from "../models/Suppression.js";

export async function getSensors(req: Request, res: Response): Promise<void> {
  const zoneId = req.operator!.zoneId;
  const sensors = await SensorModel.find({ zoneId }).sort({ sensorId: 1 }).lean();

  res.json({
    data: sensors.map((sensor: any) => ({
      id: sensor.sensorId,
      zone_id: sensor.zoneId,
      name: sensor.name,
      status: sensor.status,
      last_seen_at: sensor.lastSeenAt ?? null
    }))
  });
}

export async function getSensorHistory(req: Request, res: Response): Promise<void> {
  const zoneId = req.operator!.zoneId;
  const sensorId = req.params.id;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 100), 500);
  const from = new Date((req.query.from as string | undefined) ?? "1970-01-01T00:00:00.000Z");
  const to = new Date((req.query.to as string | undefined) ?? new Date().toISOString());
  const skip = (Math.max(page, 1) - 1) * pageSize;

  const [readings, total, suppression] = await Promise.all([
    ReadingModel.find({
      sensorId,
      zoneId,
      readingAt: { $gte: from, $lte: to }
    })
      .sort({ readingAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    ReadingModel.countDocuments({
      sensorId,
      zoneId,
      readingAt: { $gte: from, $lte: to }
    }),
    SuppressionModel.findOne({
      sensorId,
      zoneId,
      startTime: { $lte: new Date() },
      endTime: { $gte: new Date() }
    })
      .sort({ startTime: -1 })
      .lean()
  ]);

  const readingIds = readings.map((item: any) => item._id);
  const anomalies = readingIds.length
    ? await AnomalyModel.find({ readingId: { $in: readingIds } }).lean()
    : [];

  const anomalyMap = new Map<string, Array<{
    anomalyId: string;
    type: string;
    severity: string;
    suppressed: boolean;
    message: string;
    alertId: string | null;
  }>>();

  for (const anomaly of anomalies) {
    const key = String(anomaly.readingId);
    const current = anomalyMap.get(key) ?? [];
    current.push({
      anomalyId: anomaly._id.toString(),
      type: anomaly.type,
      severity: anomaly.severity,
      suppressed: anomaly.suppressed,
      message: anomaly.message,
      alertId: anomaly.alertId ? anomaly.alertId.toString() : null
    });
    anomalyMap.set(key, current);
  }

  res.json({
    page,
    pageSize,
    total,
    suppression: suppression
      ? {
          id: suppression._id.toString(),
          start_time: suppression.startTime,
          end_time: suppression.endTime,
          reason: suppression.reason ?? null
        }
      : null,
    data: readings.map((reading: any) => ({
      id: reading._id.toString(),
      reading_at: reading.readingAt,
      metric_value: reading.metricValue,
      payload: reading.payload,
      anomaly_triggered: reading.anomalyTriggered,
      anomalies: anomalyMap.get(reading._id.toString()) ?? []
    }))
  });
}
