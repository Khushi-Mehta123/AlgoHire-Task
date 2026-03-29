import { Schema, model, Types } from "mongoose";

const anomalySchema = new Schema(
  {
    readingId: { type: Schema.Types.ObjectId, ref: "Reading", index: true },
    sensorId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["threshold_breach", "rapid_change", "pattern_absence"],
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true
    },
    message: { type: String, required: true },
    suppressed: { type: Boolean, default: false },
    alertId: { type: Schema.Types.ObjectId, ref: "Alert" }
  },
  { timestamps: true }
);

anomalySchema.index({ sensorId: 1, createdAt: -1 });

export type AnomalyDocId = Types.ObjectId;
export const AnomalyModel = model("Anomaly", anomalySchema);
