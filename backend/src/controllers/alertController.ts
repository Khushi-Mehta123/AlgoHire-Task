import type { Request, Response } from "express";
import { AlertModel } from "../models/Alert.js";
import { AlertTransitionModel } from "../models/AlertTransition.js";
import { transitionSchema } from "../core/validators.js";
import { eventBus } from "../core/events.js";

function mapAlert(alert: any) {
  return {
    id: alert._id.toString(),
    sensor_id: alert.sensorId,
    zone_id: alert.zoneId,
    status: alert.status,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    opened_at: alert.openedAt,
    acknowledged_at: alert.acknowledgedAt ?? null,
    resolved_at: alert.resolvedAt ?? null,
    escalated: alert.escalated,
    escalated_at: alert.escalatedAt ?? null,
    last_anomaly_at: alert.lastAnomalyAt ?? null
  };
}

export async function getAlerts(req: Request, res: Response): Promise<void> {
  const zoneId = req.operator!.zoneId;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 100), 500);
  const skip = (Math.max(page, 1) - 1) * pageSize;
  const status = req.query.status as string | undefined;
  const sensorId = req.query.sensorId as string | undefined;

  const filter: Record<string, unknown> = { zoneId };
  if (status) filter.status = status;
  if (sensorId) filter.sensorId = sensorId;

  const alerts = await AlertModel.find(filter)
    .sort({ openedAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.json({ page, pageSize, data: alerts.map(mapAlert) });
}

export async function createAlert(req: Request, res: Response): Promise<void> {
  const zoneId = req.operator!.zoneId;
  const operatorId = req.operator!.operatorId;
  const { sensorId, severity, title, description } = req.body as {
    sensorId: string;
    severity: string;
    title: string;
    description: string;
  };

  if (!sensorId || !severity || !title || !description) {
    res.status(400).json({ error: "sensorId, severity, title, description are required" });
    return;
  }

  const created = await AlertModel.create({
    sensorId,
    zoneId,
    status: "open",
    severity,
    title,
    description,
    openedAt: new Date()
  });

  await AlertTransitionModel.create({
    alertId: created._id,
    fromStatus: null,
    toStatus: "open",
    actor: operatorId,
    reason: "manual create"
  });

  eventBus.publish({
    type: "alert.updated",
    zoneId,
    at: new Date().toISOString(),
    data: mapAlert(created.toObject())
  });

  res.status(201).json(mapAlert(created.toObject()));
}

async function transition(req: Request, res: Response, toStatus?: "open" | "acknowledged" | "resolved") {
  const zoneId = req.operator!.zoneId;
  const operatorId = req.operator!.operatorId;

  let nextStatus = toStatus;
  let reason = toStatus ? `manual ${toStatus}` : undefined;

  if (!toStatus) {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    nextStatus = parsed.data.toStatus;
    reason = parsed.data.reason;
  }

  const alert = await AlertModel.findOne({ _id: req.params.id, zoneId });
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const fromStatus = alert.status;
  alert.status = nextStatus!;
  if (nextStatus === "acknowledged") {
    alert.acknowledgedAt = new Date();
  }
  if (nextStatus === "resolved") {
    alert.resolvedAt = new Date();
  }
  await alert.save();

  await AlertTransitionModel.create({
    alertId: alert._id,
    fromStatus,
    toStatus: nextStatus,
    actor: operatorId,
    reason
  });

  eventBus.publish({
    type: "alert.updated",
    zoneId,
    at: new Date().toISOString(),
    data: mapAlert(alert.toObject())
  });

  res.json(mapAlert(alert.toObject()));
}

export async function transitionAlert(req: Request, res: Response): Promise<void> {
  await transition(req, res);
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  await transition(req, res, "acknowledged");
}

export async function resolveAlert(req: Request, res: Response): Promise<void> {
  await transition(req, res, "resolved");
}
