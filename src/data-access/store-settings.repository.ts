import "server-only";

import { schema } from "@/db";
import { executor, type DbExecutor } from "./executor";

const { storeSettings } = schema;

export async function readDeliveriesPaused(db?: DbExecutor): Promise<boolean> {
  const [row] = await executor(db).select({ deliveriesPaused: storeSettings.deliveriesPaused }).from(storeSettings).limit(1);
  return row?.deliveriesPaused ?? false;
}

export async function writeDeliveriesPaused(paused: boolean, db?: DbExecutor): Promise<void> {
  await executor(db).update(storeSettings).set({ deliveriesPaused: paused, updatedAt: new Date() });
}
