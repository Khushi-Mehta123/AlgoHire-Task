import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { postIngest } from "../controllers/ingestController.js";
import { getSensors, getSensorHistory } from "../controllers/sensorController.js";
import {
  getAlerts,
  createAlert,
  transitionAlert,
  acknowledgeAlert,
  resolveAlert
} from "../controllers/alertController.js";
import { createSuppression } from "../controllers/suppressionController.js";
import { getEvents } from "../controllers/eventController.js";

const router = Router();

router.get("/health", getHealth);
router.post("/ingest", postIngest);

router.get("/sensors", getSensors);
router.get("/sensors/:id/history", getSensorHistory);

router.get("/alerts", getAlerts);
router.post("/alerts", createAlert);
router.patch("/alerts/:id/transition", transitionAlert);
router.post("/alerts/:id/acknowledge", acknowledgeAlert);
router.post("/alerts/:id/resolve", resolveAlert);

router.post("/suppressions", createSuppression);
router.get("/events", getEvents);

export default router;
