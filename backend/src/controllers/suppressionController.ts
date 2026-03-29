import type { Request, Response } from "express";
import { suppressionSchema } from "../core/validators.js";
import { SensorModel } from "../models/Sensor.js";
import { SuppressionModel } from "../models/Suppression.js";

export async function createSuppression(req: Request, res: Response): Promise<void> {
  const parsed = suppressionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const zoneId = req.operator!.zoneId;
  const operatorId = req.operator!.operatorId;

  const sensor = await SensorModel.findOne({
    sensorId: parsed.data.sensorId,
    zoneId
  }).lean();

  if (!sensor) {
    res.status(404).json({ error: "Sensor not found in operator zone" });
    return;
  }

  const created = await SuppressionModel.create({
    sensorId: parsed.data.sensorId,
    zoneId,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
    reason: parsed.data.reason,
    createdBy: operatorId
  });

  res.status(201).json({
    id: created._id.toString(),
    sensor_id: created.sensorId,
    zone_id: created.zoneId,
    start_time: created.startTime,
    end_time: created.endTime,
    reason: created.reason ?? null,
    created_by: created.createdBy
  });
}
