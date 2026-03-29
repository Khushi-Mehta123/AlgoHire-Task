import { eventBus } from "./events.js";
import { AlertModel } from "../models/Alert.js";
import { AlertTransitionModel } from "../models/AlertTransition.js";
import { NotificationModel } from "../models/Notification.js";
import { AnomalyModel } from "../models/Anomaly.js";
import type { AlertStatus, Severity } from "../types.js";

function rankSeverity(value: Severity): number {
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function maxSeverity(a: Severity, b: Severity): Severity {
  return rankSeverity(a) >= rankSeverity(b) ? a : b;
}

export async function createOrUpdateAlertForAnomaly(params: {
  sensorId: string;
  zoneId: string;
  severity: Severity;
  title: string;
  description: string;
  anomalyAt: string;
}) {
  const { sensorId, zoneId, severity, title, description, anomalyAt } = params;

  const existing = await AlertModel.findOne({
    sensorId,
    zoneId,
    status: { $in: ["open", "acknowledged"] }
  })
    .sort({ openedAt: -1 })
    .exec();

  if (existing) {
    existing.severity = maxSeverity(existing.severity as Severity, severity);
    existing.lastAnomalyAt = new Date(anomalyAt);
    await existing.save();

    eventBus.publish({
      type: "alert.updated",
      zoneId,
      at: new Date().toISOString(),
      data: {
        id: existing._id.toString(),
        escalated: existing.escalated,
        status: existing.status,
        severity: existing.severity
      }
    });

    return existing;
  }

  const created = await AlertModel.create({
    sensorId,
    zoneId,
    status: "open",
    severity,
    title,
    description,
    openedAt: new Date(),
    lastAnomalyAt: new Date(anomalyAt)
  });

  await AlertTransitionModel.create({
    alertId: created._id,
    fromStatus: null,
    toStatus: "open",
    actor: "system",
    reason: "Auto-created from anomaly"
  });

  eventBus.publish({
    type: "alert.updated",
    zoneId,
    at: new Date().toISOString(),
    data: {
      id: created._id.toString(),
      escalated: created.escalated,
      status: created.status,
      severity: created.severity
    }
  });

  return created;
}

export async function transitionAlert(params: {
  alertId: string;
  zoneId: string;
  actor: string;
  toStatus: AlertStatus;
  reason?: string;
}) {
  const current = await AlertModel.findOne({ _id: params.alertId, zoneId: params.zoneId }).exec();

  if (!current) {
    return null;
  }

  const fromStatus = current.status as AlertStatus;
  const now = new Date();

  current.status = params.toStatus;
  if (params.toStatus === "acknowledged") {
    current.acknowledgedAt = now;
  }
  if (params.toStatus === "resolved") {
    current.resolvedAt = now;
  }

  await current.save();

  await AlertTransitionModel.create({
    alertId: current._id,
    fromStatus,
    toStatus: params.toStatus,
    actor: params.actor,
    reason: params.reason
  });

  eventBus.publish({
    type: "alert.updated",
    zoneId: params.zoneId,
    at: now.toISOString(),
    data: {
      id: current._id.toString(),
      status: current.status,
      escalated: current.escalated
    }
  });

  return current;
}

export async function runEscalationSweep(): Promise<number> {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);

  const escalatable = await AlertModel.find({
    status: "open",
    escalated: false,
    openedAt: { $lte: threshold }
  }).exec();

  if (!escalatable.length) {
    return 0;
  }

  for (const alert of escalatable) {
    alert.escalated = true;
    alert.escalatedAt = new Date();
    await alert.save();

    const latestAnomaly = await AnomalyModel.findOne({ alertId: alert._id })
      .sort({ createdAt: -1 })
      .exec();

    if (latestAnomaly) {
      await NotificationModel.create({
        anomalyId: latestAnomaly._id,
        alertId: alert._id,
        zoneId: alert.zoneId,
        channel: "escalation",
        delivered: false
      });
    }

    eventBus.publish({
      type: "alert.updated",
      zoneId: alert.zoneId,
      at: new Date().toISOString(),
      data: { id: alert._id.toString(), escalated: true }
    });
  }

  return escalatable.length;
}
