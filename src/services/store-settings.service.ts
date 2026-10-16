import "server-only";

import { readDeliveriesPaused as readPaused, writeDeliveriesPaused } from "@/data-access/store-settings.repository";

export function readDeliveriesPaused(): Promise<boolean> {
  return readPaused();
}

export function updateDeliveriesPaused(paused: boolean): Promise<void> {
  return writeDeliveriesPaused(paused);
}
