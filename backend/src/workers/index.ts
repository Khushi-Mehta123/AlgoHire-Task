import { connectMongo } from "../core/mongo.js";
import { processReading, runPatternAbsenceSweep } from "../core/anomalyEngine.js";
import { runEscalationSweep } from "../core/alertService.js";
import { IngestQueueModel } from "../models/IngestQueue.js";

async function processQueueBatch(limit = 100): Promise<number> {
  const jobs = await IngestQueueModel.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  if (!jobs.length) {
    return 0;
  }

  for (const job of jobs) {
    const claimed = await IngestQueueModel.findOneAndUpdate(
      { _id: job._id, status: "pending" },
      { $set: { status: "processing" }, $inc: { attempts: 1 } },
      { new: true }
    ).lean();

    if (!claimed) {
      continue;
    }

    try {
      await processReading(String(claimed.readingId));
      await IngestQueueModel.updateOne(
        { _id: claimed._id },
        { $set: { status: "done" } }
      );
    } catch {
      await IngestQueueModel.updateOne(
        { _id: claimed._id },
        { $set: { status: "failed" } }
      );
    }
  }

  return jobs.length;
}

async function tick(): Promise<void> {
  await processQueueBatch(200);
}

setInterval(() => {
  void tick();
}, 1000);

setInterval(() => {
  void runPatternAbsenceSweep();
}, 30_000);

setInterval(() => {
  void runEscalationSweep();
}, 15_000);

async function startWorkers(): Promise<void> {
  await connectMongo();
  console.log("Workers started: queue(1s), pattern-absence(30s), escalation(15s)");
}

void startWorkers();
