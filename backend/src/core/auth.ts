import type { NextFunction, Request, Response } from "express";
import type { OperatorContext } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      operator?: OperatorContext;
    }
  }
}

export function requireOperatorContext(req: Request, res: Response, next: NextFunction): void {
  const zoneId = req.header("x-zone-id") ?? (req.query.zoneId as string | undefined);
  const operatorId = req.header("x-operator-id") ?? (req.query.operatorId as string | undefined);

  if (!zoneId || !operatorId) {
    res.status(400).json({
      error: "Missing required headers x-zone-id and x-operator-id"
    });
    return;
  }

  req.operator = { zoneId, operatorId };
  next();
}
