export function safeWhatsAppUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "wa.me") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Acepta solo http(s). Las fotos del catálogo son URLs arbitrarias. */
export function safeImageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
