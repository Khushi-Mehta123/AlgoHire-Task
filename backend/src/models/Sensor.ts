import { Schema, model } from "mongoose";

const sensorSchema = new Schema(
  {
    sensorId: { type: String, required: true, unique: true, index: true },
    zoneId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["healthy", "warning", "offline"],
      default: "healthy",
      index: true
    },
    lastSeenAt: { type: Date }
  },
  { timestamps: true }
);

sensorSchema.index({ zoneId: 1, sensorId: 1 });

export const SensorModel = model("Sensor", sensorSchema);
