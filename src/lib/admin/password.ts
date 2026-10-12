import "server-only";

import bcrypt from "bcryptjs";
import { getServerEnv } from "@/lib/env";

/** Hash válido para igualar el tiempo de comparación si el usuario no coincide. */
const timingDecoyHash = "$2b$12$8au3FRGrCdXuHe8X1g605O8CmqBYjZekBGbrlw7m.gzE6H.vaEuJa";

export async function adminPasswordMatches(username: string, password: string): Promise<boolean> {
  const env = getServerEnv();
  const usernameMatches = timingSafeEqualString(username, env.ADMIN_USERNAME);
  const hash = usernameMatches ? env.ADMIN_PASSWORD_HASH : timingDecoyHash;
  const passwordMatches = await bcrypt.compare(password, hash);
  return usernameMatches && passwordMatches;
}

function timingSafeEqualString(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
