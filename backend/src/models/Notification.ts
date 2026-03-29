import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    anomalyId: { type: Schema.Types.ObjectId, ref: "Anomaly", required: true, index: true },
    alertId: { type: Schema.Types.ObjectId, ref: "Alert", index: true },
    zoneId: { type: String, required: true, index: true },
    channel: { type: String, required: true },
    delivered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const NotificationModel = model("Notification", notificationSchema);
