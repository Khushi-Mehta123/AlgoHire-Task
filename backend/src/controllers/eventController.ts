import type { Request, Response } from "express";
import { eventBus } from "../core/events.js";

export function getEvents(req: Request, res: Response): void {
  const zoneId = req.operator!.zoneId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const unsubscribe = eventBus.subscribe((event) => {
    if (event.zoneId !== zoneId) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on("close", () => {
    unsubscribe();
    res.end();
  });
}
