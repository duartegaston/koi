export function safeWhatsAppUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "wa.me") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Checkout Pro redirige a un host de Mercado Pago por HTTPS. */
export function safeMercadoPagoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !isMercadoPagoHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeMapUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "www.openstreetmap.org") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isMercadoPagoHost(hostname: string): boolean {
  return /(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(hostname);
}

const storedImagePath = /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const catalogImagePath = /^\/productos\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/;

/** Acepta http(s), una foto del bucket en /media/{uuid}, o una del catálogo en /productos/. */
export function safeImageUrl(value: string): string | null {
  if (storedImagePath.test(value) || catalogImagePath.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
