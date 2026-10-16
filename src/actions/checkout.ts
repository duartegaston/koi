"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearCartCookie, readOpenCart } from "@/lib/cart-session";
import { writeOrderGrant } from "@/lib/order-grant";
import { allowClient } from "@/lib/rate-limit";
import { safeMercadoPagoUrl } from "@/lib/safe-url";
import { placeOrderSchema, quoteAddressSchema } from "@/lib/validations/checkout";
import { placeOrder } from "@/services/checkout.service";
import { quoteDelivery } from "@/services/shipping.service";

export type DeliveryQuoteView = {
  enteredAddress: string;
  formattedAddress: string;
  zoneName: string;
  price: string;
  distanceKm: string;
  latitude: string;
  longitude: string;
};

export type CheckoutFieldErrors = Partial<{
  customerName: string[];
  customerPhone: string[];
  customerEmail: string[];
  address: string[];
  fulfillmentMethod: string[];
  paymentMethod: string[];
}>;

export type CheckoutState =
  | { status: "idle" }
  | { status: "quoted"; quote: DeliveryQuoteView }
  | { status: "error"; message: string; fieldErrors?: CheckoutFieldErrors; quote?: DeliveryQuoteView };

function keptQuote(prev: CheckoutState): DeliveryQuoteView | undefined {
  if (prev.status === "quoted") return prev.quote;
  if (prev.status === "error") return prev.quote;
  return undefined;
}

export async function submitCheckout(prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const intent = String(formData.get("intent") ?? "");

  if (intent === "quote") {
    const parsed = quoteAddressSchema.safeParse({
      address: String(formData.get("address") ?? ""),
    });
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      return {
        status: "error",
        message: "Revisá la dirección.",
        fieldErrors: { address: fieldErrors.address },
      };
    }

    if (!(await allowClient("deliveryQuote"))) {
      return {
        status: "error",
        message: "No pudimos cotizar otra vez ahora. Esperá unos minutos.",
        fieldErrors: { address: ["No pudimos cotizar otra vez ahora. Esperá unos minutos."] },
      };
    }

    const quote = await quoteDelivery(parsed.data.address);
    if (!quote.ok) {
      return {
        status: "error",
        message: quote.message,
        fieldErrors: { address: [quote.message] },
      };
    }

    return {
      status: "quoted",
      quote: {
        enteredAddress: quote.value.enteredAddress,
        formattedAddress: quote.value.formattedAddress,
        zoneName: quote.value.shippingZoneName,
        price: quote.value.price,
        distanceKm: quote.value.distanceKm,
        latitude: quote.value.latitude,
        longitude: quote.value.longitude,
      },
    };
  }

  if (intent !== "place") {
    return { status: "error", message: "No pudimos procesar el pedido.", quote: keptQuote(prev) };
  }

  const parsed = placeOrderSchema.safeParse({
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    fulfillmentMethod: String(formData.get("fulfillmentMethod") ?? ""),
    address: String(formData.get("address") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      quote: keptQuote(prev),
    };
  }

  if (!(await allowClient("checkoutPlace"))) {
    return {
      status: "error",
      message: "No pudimos tomar otro pedido ahora. Esperá unos minutos.",
      quote: keptQuote(prev),
    };
  }

  const cart = await readOpenCart();
  if (!cart) {
    return {
      status: "error",
      message: "El carrito no está disponible. Volvé a armar el pedido.",
      quote: keptQuote(prev),
    };
  }

  const placed = await placeOrder({
    cartId: cart.id,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail === "" ? undefined : parsed.data.customerEmail,
    fulfillmentMethod: parsed.data.fulfillmentMethod,
    address: parsed.data.address,
    paymentMethod: parsed.data.paymentMethod,
  });
  if (!placed.ok) {
    return { status: "error", message: placed.message, quote: keptQuote(prev) };
  }

  const checkoutUrl = placed.value.checkoutUrl ? safeMercadoPagoUrl(placed.value.checkoutUrl) : null;
  await clearCartCookie();
  await writeOrderGrant(placed.value.publicCode, checkoutUrl);
  revalidatePath("/", "layout");
  redirect(`/checkout/pedido/${placed.value.publicCode}`);
}
