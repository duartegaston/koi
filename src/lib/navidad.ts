/** Categoría temporal de fiestas: a pedido hasta el 8/12, entrega antes de Navidad. */
export const NAVIDAD_CATEGORY_SLUG = "navidad";

export const NAVIDAD_CATEGORY_NAME = "Navidad";

export const NAVIDAD_CATEGORY_DESCRIPTION =
  "A pedido hasta el 8 de diciembre. Se entregan antes de las fiestas.";

export const NAVIDAD_CARD_LABEL = "A pedido hasta el 8 de diciembre · Entrega antes de las fiestas";

export const NAVIDAD_ORDER_NOTE =
  "A pedido hasta el 8 de diciembre. Se entregan antes de las fiestas.";

export const NAVIDAD_MADE_TO_ORDER_SUFFIX =
  "a pedido hasta el 8 de diciembre, entrega antes de las fiestas";

export function isNavidadCategory(slug: string | null | undefined): boolean {
  return slug === NAVIDAD_CATEGORY_SLUG;
}

/** Navidad se muestra como disponible aunque el stock real sea 0. */
export function showsAsAvailable(stock: number, categorySlug: string | null | undefined): boolean {
  return stock > 0 || isNavidadCategory(categorySlug);
}

export function productAvailabilityLabel(stock: number, categorySlug: string | null | undefined): string {
  if (isNavidadCategory(categorySlug)) return NAVIDAD_CARD_LABEL;
  return stock > 0 ? "En stock" : "A pedido · 7 a 10 días hábiles";
}
