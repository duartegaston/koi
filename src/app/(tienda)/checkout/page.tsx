import type { Metadata } from "next";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { readCartSnapshot } from "@/lib/cart-session";
import { getStoreOptions } from "@/services/shipping.service";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await readCartSnapshot();
  const store = getStoreOptions();

  return <CheckoutForm cart={cart} store={store} storeError={null} />;
}
