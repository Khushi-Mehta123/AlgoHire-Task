import { Schema, model } from "mongoose";

const suppressionSchema = new Schema(
  {
    sensorId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    reason: { type: String },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

suppressionSchema.index({ sensorId: 1, startTime: 1, endTime: 1 });

export const SuppressionModel = model("Suppression", suppressionSchema);
