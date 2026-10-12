import type { Metadata } from "next";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { readCartSnapshot } from "@/lib/cart-session";
import { getStoreOptions } from "@/services/shipping.service";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cart, store] = await Promise.all([readCartSnapshot(), getStoreOptions()]);

  return (
    <CheckoutForm
      cart={cart}
      store={store.ok ? store.value : null}
      storeError={store.ok ? null : store.message}
    />
  );
}
