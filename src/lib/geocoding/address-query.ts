export function streetSearchText(value: string): string {
  return value
    .replace(/\s+\d{1,5}\s*$/, "")
    .replace(/[^\p{L}\d\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function houseNumber(value: string): string | null {
  const match = value.trim().match(/^(.*\p{L}.*)\s+(\d{1,5})$/u);
  return match?.[2] ?? null;
}

export function presentStreet(name: string): string {
  return name.toLocaleLowerCase("es-AR").replace(/(^|\s)(\p{L})/gu, (_match, space: string, letter: string) => {
    return `${space}${letter.toLocaleUpperCase("es-AR")}`;
  });
}
