import "server-only";

import { sql } from "drizzle-orm";
import { schema } from "@/db";
import { executor } from "./executor";

const { storeSettings } = schema;

export async function readAdminSessionVersion(): Promise<number | null> {
  const [row] = await executor()
    .select({ version: storeSettings.adminSessionVersion })
    .from(storeSettings)
    .limit(1);
  return row?.version ?? null;
}

export async function bumpAdminSessionVersion(): Promise<void> {
  await executor()
    .update(storeSettings)
    .set({
      adminSessionVersion: sql`${storeSettings.adminSessionVersion} + 1`,
      updatedAt: new Date(),
    });
}
