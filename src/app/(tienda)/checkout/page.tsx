import type { Metadata } from "next";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { readCartSnapshot } from "@/lib/cart-session";
import { getStoreOptions } from "@/services/shipping.service";
import { readDeliveriesPaused } from "@/services/store-settings.service";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [cart, deliveriesPaused] = await Promise.all([readCartSnapshot(), readDeliveriesPaused()]);
  const store = { ...getStoreOptions(), deliveriesPaused };

  return <CheckoutForm cart={cart} store={store} storeError={null} />;
}
