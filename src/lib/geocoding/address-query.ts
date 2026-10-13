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
