"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { allowClient } from "@/lib/rate-limit";
import { adminLoginSchema } from "@/lib/validations/admin";
import { signInAdmin, signOutAdmin } from "@/services/admin-auth.service";

export type LoginState = { status: "idle" } | { status: "error"; message: string; fieldErrors?: { username?: string[]; password?: string[] } };

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return { status: "error", message: "Revisá los datos.", fieldErrors };
  }

  if (!(await allowClient("adminLogin"))) {
    return { status: "error", message: "Demasiados intentos. Esperá unos minutos y probá de nuevo." };
  }

  const result = await signInAdmin(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await signOutAdmin();
  redirect("/admin/login");
}
