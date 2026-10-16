/** Código corto de un error, sin mensaje ni datos del request. */
export function errorCode(error: unknown): string {
  const code = readCode(error);
  return code ?? "unknown";
}

function readCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && (typeof error.code === "string" || typeof error.code === "number")) {
    const code = String(error.code);
    if (/^[A-Za-z0-9_-]{1,32}$/.test(code)) return code;
  }
  if ("cause" in error) return readCode(error.cause);
  return undefined;
}
