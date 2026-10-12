import "server-only";

import { getDb, getTransactionDb, type Database } from "@/db";

export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | DbTransaction;

export function executor(db?: DbExecutor): DbExecutor {
  return db ?? getDb();
}

export function transaction<T>(run: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return getTransactionDb().transaction(run);
}

function hasPgCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === code) return true;
  if ("cause" in error) return hasPgCode(error.cause, code);
  return false;
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPgCode(error, "23505");
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasPgCode(error, "23503");
}

export function firstRow<T>(rows: T[], message: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(message);
  }
  return row;
}
