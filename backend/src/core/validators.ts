import { z } from "zod";

export const ingestSchema = z.object({
  readings: z.array(
    z.object({
      sensorId: z.string().min(1),
      sensorName: z.string().min(1).optional(),
      zoneId: z.string().min(1),
      readingAt: z.string().datetime(),
      metricValue: z.number(),
      payload: z.record(z.unknown()).optional()
    })
  ).min(1).max(500)
});

export const suppressionSchema = z.object({
  sensorId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().min(1).max(500).optional()
});

export const transitionSchema = z.object({
  toStatus: z.enum(["open", "acknowledged", "resolved"]),
  reason: z.string().max(500).optional()
});
