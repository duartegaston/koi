export function encodeOrderCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}_${id}`;
}

const cursorPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function decodeOrderCursor(value: string): { createdAt: Date; id: string } | null {
  const match = cursorPattern.exec(value);
  const stamp = match?.[1];
  const id = match?.[2];
  if (!stamp || !id) return null;
  const createdAt = new Date(stamp);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}
