export function streetSearchText(value: string): string {
  return value
    .replace(/\s+\d{1,5}\s*$/, "")
    .replace(/[^\p{L}\d\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
