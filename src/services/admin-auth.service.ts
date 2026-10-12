import "server-only";

import { redirect } from "next/navigation";
import { adminPasswordMatches } from "@/lib/admin/password";
import { clearAdminSession, readAdminSession, writeAdminSession } from "@/lib/admin/session";
import { fail, type ServiceResult } from "./result";

export async function requireAdmin(): Promise<void> {
  if (!(await readAdminSession())) {
    redirect("/admin/login");
  }
}

export async function signInAdmin(username: string, password: string): Promise<ServiceResult<{ signedIn: true }>> {
  const matches = await adminPasswordMatches(username, password);
  if (!matches) {
    console.warn("admin login failed");
    return fail("invalid_credentials", "Usuario o contraseña incorrectos.");
  }
  await writeAdminSession();
  return { ok: true, value: { signedIn: true } };
}

export async function signOutAdmin(): Promise<void> {
  await clearAdminSession();
}
