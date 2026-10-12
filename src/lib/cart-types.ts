export type CartLineSnapshot = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  imageUrl: string | null;
  problem: "unavailable" | "exceeds_limit" | null;
  limit: number | null;
};

export type CartSnapshot = {
  lines: CartLineSnapshot[];
  subtotal: string;
  itemCount: number;
};

export const emptyCart: CartSnapshot = {
  lines: [],
  subtotal: "0.00",
  itemCount: 0,
};
