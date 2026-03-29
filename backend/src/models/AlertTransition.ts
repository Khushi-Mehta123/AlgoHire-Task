import { Schema, model } from "mongoose";

const alertTransitionSchema = new Schema(
  {
    alertId: { type: Schema.Types.ObjectId, ref: "Alert", required: true, index: true },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    actor: { type: String, required: true },
    reason: { type: String }
  },
  { timestamps: true }
);

export const AlertTransitionModel = model("AlertTransition", alertTransitionSchema);
