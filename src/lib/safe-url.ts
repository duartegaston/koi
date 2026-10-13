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

const googleMapQuery = /^-?\d{1,3}\.\d{1,6},-?\d{1,3}\.\d{1,6}$/;

/** Solo el enlace de coordenadas que arma `mapLink`. */
export function safeMapUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const query = url.searchParams.get("query");
    const keys = [...url.searchParams.keys()];
    if (url.protocol !== "https:" || url.hostname !== "www.google.com" || url.pathname !== "/maps/search/") return null;
    if (keys.length !== 2 || url.searchParams.get("api") !== "1" || !query || !googleMapQuery.test(query)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isMercadoPagoHost(hostname: string): boolean {
  return /(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(hostname);
}

const storedImagePath = /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Acepta http(s) o una foto del bucket en /media/{uuid}. */
export function safeImageUrl(value: string): string | null {
  if (storedImagePath.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
