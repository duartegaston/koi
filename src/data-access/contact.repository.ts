import "server-only";

import { schema } from "@/db";
import { executor, type DbExecutor } from "./executor";

const { contactMessages } = schema;

export type NewContactMessageInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export async function insertContactMessage(input: NewContactMessageInput, db?: DbExecutor) {
  await executor(db).insert(contactMessages).values({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message,
  });
}
