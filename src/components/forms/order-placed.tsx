"use client";

import { useEffect } from "react";
import { publishCart } from "@/components/layout/cart-store";
import { emptyCart } from "@/lib/cart-types";

export function OrderPlaced({ checkoutUrl }: { checkoutUrl: string | null }) {
  useEffect(() => {
    publishCart(emptyCart, "server");
  }, []);

  useEffect(() => {
    if (checkoutUrl) window.location.assign(checkoutUrl);
  }, [checkoutUrl]);

  return null;
}
