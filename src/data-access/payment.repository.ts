import "server-only";

import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { executor, firstRow, isUniqueViolation, type DbExecutor } from "./executor";
import { paymentMethods, type PaymentMethod } from "./order.repository";

const { payments } = schema;

export const paymentStatuses = ["pending", "approved", "rejected"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentRecord = {
  id: string;
  orderId: string;
  provider: PaymentMethod;
  externalId: string | null;
  status: PaymentStatus;
  amount: string;
};

export type NewPaymentInput = {
  orderId: string;
  provider: PaymentMethod;
  externalId?: string;
  status?: PaymentStatus;
  amount: string;
};

export async function insertPayment(input: NewPaymentInput, db?: DbExecutor): Promise<PaymentRecord> {
  try {
    const row = firstRow(
      await executor(db).insert(payments).values(input).returning({
        id: payments.id,
        orderId: payments.orderId,
        provider: payments.provider,
        externalId: payments.externalId,
        status: payments.status,
        amount: payments.amount,
      }),
      "No se pudo registrar el pago",
    );
    return mapPayment(row);
  } catch (error) {
    if (!input.externalId || !isUniqueViolation(error)) {
      throw error;
    }
    const existing = await findPaymentByExternalId(input.provider, input.externalId, db);
    if (!existing) {
      throw error;
    }
    return existing;
  }
}

export async function findPaymentByExternalId(
  provider: PaymentMethod,
  externalId: string,
  db?: DbExecutor,
): Promise<PaymentRecord | null> {
  const [row] = await executor(db)
    .select({
      id: payments.id,
      orderId: payments.orderId,
      provider: payments.provider,
      externalId: payments.externalId,
      status: payments.status,
      amount: payments.amount,
    })
    .from(payments)
    .where(and(eq(payments.provider, provider), eq(payments.externalId, externalId)))
    .limit(1);

  return row ? mapPayment(row) : null;
}

export async function setPaymentStatus(paymentId: string, status: PaymentStatus, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(payments)
    .set({ status })
    .where(eq(payments.id, paymentId))
    .returning({
      id: payments.id,
      orderId: payments.orderId,
      provider: payments.provider,
      externalId: payments.externalId,
      status: payments.status,
      amount: payments.amount,
    });

  return row ? mapPayment(row) : null;
}

function mapPayment(row: {
  id: string;
  orderId: string;
  provider: string;
  externalId: string | null;
  status: string;
  amount: string;
}): PaymentRecord {
  return {
    ...row,
    provider: asPaymentMethod(row.provider),
    status: asPaymentStatus(row.status),
  };
}

function asPaymentMethod(value: string): PaymentMethod {
  if (paymentMethods.includes(value as PaymentMethod)) {
    return value as PaymentMethod;
  }
  throw new Error(`Método de pago desconocido: ${value}`);
}

function asPaymentStatus(value: string): PaymentStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  throw new Error(`Estado de pago desconocido: ${value}`);
}
