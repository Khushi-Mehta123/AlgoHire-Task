import { Schema, model, Types } from "mongoose";

const readingSchema = new Schema(
  {
    sensorId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true, index: true },
    readingAt: { type: Date, required: true, index: true },
    metricValue: { type: Number, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    anomalyTriggered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

readingSchema.index({ sensorId: 1, readingAt: -1 });
readingSchema.index({ zoneId: 1, readingAt: -1 });

export type ReadingDocId = Types.ObjectId;
export const ReadingModel = model("Reading", readingSchema);
