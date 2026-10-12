export function normalizeOrderCode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const code = value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
  return code.length > 0 ? code : undefined;
}

export function ordersPath(input: {
  status?: string;
  paymentMethod?: string;
  code?: string;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.paymentMethod) params.set("paymentMethod", input.paymentMethod);
  if (input.code) params.set("code", input.code);
  if (input.cursor) params.set("cursor", input.cursor);
  const query = params.toString();
  return query ? `/admin/pedidos?${query}` : "/admin/pedidos";
}
