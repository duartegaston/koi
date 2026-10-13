export const siteName = "Koi";

/** URL pública canónica. En el Worker gana `APP_URL`. */
export const publishedSiteUrl = "https://koichocolates.com.ar";

export const instagramUrl = "https://www.instagram.com/koi.chocolates/";

export const defaultOgImage = "/brand/og.png";

export const homeTitle = "Koi, chocolates Rapanui con envío o retiro en Posadas";

export const homeDescription =
  "Koi toma pedidos de chocolates Rapanui en Posadas, Misiones. Elegí en la tienda: envío dentro de la ciudad o retiro en el local.";

export const shopTitle = "Catálogo de chocolates Rapanui en Posadas, Misiones";

export const shopDescription =
  "Catálogo de chocolates Rapanui de Koi en Posadas. Mirá lo que hay en stock y lo que se pide, con envío en la ciudad o retiro en el local.";

export const contactTitle = "Contacto por WhatsApp para pedidos en Posadas";

export const contactDescription =
  "Escribinos por WhatsApp para pedir chocolates Rapanui, coordinar un retiro o hacer una consulta. Estamos en Posadas, Misiones.";

export const catalogDescription =
  "Chocolates Rapanui de Koi en Posadas, Misiones. Pedilos con envío en la ciudad o retiralos en el local de lunes a sábado.";

export const storeHourLines = [
  "Lunes a viernes de 10:30 a 16:00 y 20:00 a 23:00.",
  "Sábados de 11:30 a 15:00 y 18:30 a 20:30.",
] as const;

export const openingHours = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:30",
    closes: "16:00",
  },
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "20:00",
    closes: "23:00",
  },
  { days: ["Saturday"], opens: "11:30", closes: "15:00" },
  { days: ["Saturday"], opens: "18:30", closes: "20:30" },
] as const;
