import type { Request, Response } from "express";
import { ingestSchema } from "../core/validators.js";
import { SensorModel } from "../models/Sensor.js";
import { ReadingModel } from "../models/Reading.js";
import { IngestQueueModel } from "../models/IngestQueue.js";

export async function postIngest(req: Request, res: Response): Promise<void> {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const operator = req.operator!;
  const rows = parsed.data.readings;

  for (const item of rows) {
    if (item.zoneId !== operator.zoneId) {
      res.status(403).json({ error: `Zone mismatch for sensor ${item.sensorId}` });
      return;
    }
  }

  const sensorOps = rows.map((item) => ({
    updateOne: {
      filter: { sensorId: item.sensorId },
      update: {
        $set: {
          zoneId: item.zoneId,
          name: item.sensorName ?? item.sensorId,
          lastSeenAt: new Date(item.readingAt)
        },
        $setOnInsert: {
          status: "healthy"
        }
      },
      upsert: true
    }
  }));

  await SensorModel.bulkWrite(sensorOps);

  const insertedReadings = await ReadingModel.insertMany(
    rows.map((item) => ({
      sensorId: item.sensorId,
      zoneId: item.zoneId,
      readingAt: new Date(item.readingAt),
      metricValue: item.metricValue,
      payload: item.payload ?? {},
      anomalyTriggered: false
    }))
  );

  const queued = await IngestQueueModel.insertMany(
    insertedReadings.map((reading) => ({
      readingId: reading._id,
      status: "pending"
    }))
  );

  res.status(202).json({
    accepted: rows.length,
    queuedReadingIds: queued.map((item) => item.readingId.toString())
  });
}
