import { Schema, model } from "mongoose";

const ingestQueueSchema = new Schema(
  {
    readingId: { type: Schema.Types.ObjectId, ref: "Reading", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
      index: true
    },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ingestQueueSchema.index({ status: 1, createdAt: 1 });

export const IngestQueueModel = model("IngestQueue", ingestQueueSchema);
