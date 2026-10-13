export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Mantiene "60 gr." o "50 g" en la misma línea cuando el título se parte. */
export function formatProductName(name: string) {
  return name.replace(/(\d+)\s+(grs\.?|gr\.?|kg\.?|ml\.?|g\.?)(?!\p{L})/giu, "$1\u00A0$2");
}
