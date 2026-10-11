import "server-only";

import { getDb, type Database } from "@/db";

export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | DbTransaction;

export function executor(db?: DbExecutor): DbExecutor {
  return db ?? getDb();
}

export function transaction<T>(run: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return getDb().transaction(run);
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if ("code" in error && error.code === "23505") {
    return true;
  }
  if ("cause" in error) {
    return isUniqueViolation(error.cause);
  }
  return false;
}

export function firstRow<T>(rows: T[], message: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(message);
  }
  return row;
}
