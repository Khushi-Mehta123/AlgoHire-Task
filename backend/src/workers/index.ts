import { db } from "../core/db.js";
import { processReading, runPatternAbsenceSweep } from "../core/anomalyEngine.js";
import { runEscalationSweep } from "../core/alertService.js";

async function processQueueBatch(limit = 100): Promise<number> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const jobs = await client.query(
      `SELECT id, reading_id
       FROM ingest_queue
       WHERE status = 'pending'
       ORDER BY created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    for (const job of jobs.rows) {
      await client.query(
        `UPDATE ingest_queue
         SET status = 'processing', attempts = attempts + 1, updated_at = now()
         WHERE id = $1`,
        [job.id]
      );
    }

    await client.query("COMMIT");

    for (const job of jobs.rows) {
      try {
        await processReading(Number(job.reading_id));
        await db.query(
          `UPDATE ingest_queue SET status = 'done', updated_at = now() WHERE id = $1`,
          [job.id]
        );
      } catch {
        await db.query(
          `UPDATE ingest_queue SET status = 'failed', updated_at = now() WHERE id = $1`,
          [job.id]
        );
      }
    }

    return jobs.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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

console.log("Workers started: queue(1s), pattern-absence(30s), escalation(15s)");
