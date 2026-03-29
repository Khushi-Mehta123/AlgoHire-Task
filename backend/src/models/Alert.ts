import { Schema, model, Types } from "mongoose";

const alertSchema = new Schema(
  {
    sensorId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      required: true,
      default: "open",
      index: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    openedAt: { type: Date, default: Date.now, index: true },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    escalated: { type: Boolean, default: false, index: true },
    escalatedAt: { type: Date },
    lastAnomalyAt: { type: Date }
  },
  { timestamps: true }
);

alertSchema.index({ zoneId: 1, status: 1, openedAt: -1 });

export type AlertDocId = Types.ObjectId;
export const AlertModel = model("Alert", alertSchema);
