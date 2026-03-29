import { EventEmitter } from "node:events";

export interface DashboardEvent {
  type: "sensor.updated" | "alert.updated" | "anomaly.created";
  zoneId: string;
  at: string;
  data: Record<string, unknown>;
}

class EventBus extends EventEmitter {
  publish(event: DashboardEvent): void {
    this.emit("event", event);
  }

  subscribe(handler: (event: DashboardEvent) => void): () => void {
    this.on("event", handler);
    return () => this.off("event", handler);
  }
}

export const eventBus = new EventBus();
