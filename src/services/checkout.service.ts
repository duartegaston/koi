import "server-only";

import { findCart, listCartLines, setCartStatus } from "@/data-access/cart.repository";
import { isUniqueViolation, transaction } from "@/data-access/executor";
import { insertOrder, insertOrderItems, type FulfillmentMethod, type PaymentMethod } from "@/data-access/order.repository";
import { insertPayment } from "@/data-access/payment.repository";
import { findStoreLocation } from "@/data-access/shipping.repository";
import { addAmounts, multiplyAmount } from "@/lib/money";
import { getServerEnv } from "@/lib/env";
import { orderWhatsAppText, whatsAppLink } from "@/lib/whatsapp/link";
import { toCartView } from "./cart.service";
import { fail, type ServiceResult } from "./result";
import { quoteDelivery, type DeliveryQuote } from "./shipping.service";

export type PlaceOrderInput = {
  cartId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: string;
  paymentMethod: PaymentMethod;
};

export type PlacedOrder = {
  publicCode: string;
  subtotal: string;
  shippingCost: string;
  total: string;
  fulfillmentMethod: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  transferAlias: string | null;
  whatsAppUrl: string;
};

export async function placeOrder(input: PlaceOrderInput): Promise<ServiceResult<PlacedOrder>> {
  const customer = readCustomer(input);
  if (!customer.ok) {
    return customer;
  }

  const cart = await findCart(input.cartId);
  if (!cart || cart.status !== "active" || cart.expiresAt.getTime() <= Date.now()) {
    return fail("cart_unavailable", "El carrito no está disponible. Volvé a armar el pedido.");
  }

  const preview = toCartView(cart, await listCartLines(input.cartId));
  if (preview.lines.length === 0) {
    return fail("empty_cart", "El carrito está vacío.");
  }
  const blocked = preview.lines.find((line) => line.problem);
  if (blocked) {
    return fail("line_not_sellable", `${blocked.name} ya no se puede pedir en esa cantidad.`);
  }

  const store = await findStoreLocation();
  if (!store) {
    return fail("store_not_configured", "El local no está configurado.");
  }

  let delivery: DeliveryQuote | null = null;
  if (input.fulfillmentMethod === "motorcycle") {
    const quote = await quoteDelivery(input.address ?? "");
    if (!quote.ok) {
      return quote;
    }
    delivery = quote.value;
  } else if (input.fulfillmentMethod === "pickup") {
    if (!store.pickupAddress) {
      return fail("pickup_address_missing", "El local todavía no tiene la dirección de retiro.");
    }
  } else {
    return fail("fulfillment_invalid", "Elegí envío o retiro en el local.");
  }

  if (input.paymentMethod === "transfer" && !store.transferAlias) {
    return fail("transfer_alias_missing", "La transferencia todavía no tiene un alias cargado.");
  }
  if (input.paymentMethod !== "transfer" && input.paymentMethod !== "mercadopago") {
    return fail("payment_invalid", "Elegí Mercado Pago o transferencia.");
  }

  try {
    const placed = await transaction(async (tx) => {
      const current = toCartView(cart, await listCartLines(input.cartId, tx));
      if (current.lines.length === 0) {
        throw new CheckoutRejected("empty_cart", "El carrito está vacío.");
      }
      const unsellable = current.lines.find((line) => line.problem);
      if (unsellable) {
        throw new CheckoutRejected("line_not_sellable", `${unsellable.name} ya no se puede pedir en esa cantidad.`);
      }

      const subtotal = current.subtotal;
      const shippingCost = delivery?.price ?? "0.00";
      const total = addAmounts(subtotal, shippingCost);
      const order = await insertOrder(
        {
          cartId: input.cartId,
          customerName: customer.value.name,
          customerPhone: customer.value.phone,
          customerEmail: customer.value.email,
          fulfillmentMethod: input.fulfillmentMethod,
          addressLine: delivery?.formattedAddress,
          city: delivery?.city,
          province: delivery?.province,
          latitude: delivery?.latitude,
          longitude: delivery?.longitude,
          distanceKm: delivery?.distanceKm,
          shippingZoneId: delivery?.shippingZoneId,
          subtotal,
          shippingCost,
          total,
          paymentMethod: input.paymentMethod,
        },
        tx,
      );

      await insertOrderItems(
        order.id,
        current.lines.map((line) => ({
          productId: line.productId,
          productName: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: multiplyAmount(line.unitPrice, line.quantity),
        })),
        tx,
      );
      await insertPayment({ orderId: order.id, provider: input.paymentMethod, amount: total, status: "pending" }, tx);
      await setCartStatus(input.cartId, "converted", tx);

      return { order, lines: current.lines, subtotal, shippingCost, total };
    });

    const whatsAppUrl = whatsAppLink(
      getServerEnv().WHATSAPP_NUMBER,
      orderWhatsAppText({
        publicCode: placed.order.publicCode,
        customerName: customer.value.name,
        customerPhone: customer.value.phone,
        lines: placed.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
        fulfillmentMethod: input.fulfillmentMethod,
        addressLine: delivery?.formattedAddress ?? null,
        shippingCost: placed.shippingCost,
        total: placed.total,
        paymentMethod: input.paymentMethod,
        transferAlias: store.transferAlias,
        pickupAddress: store.pickupAddress,
      }),
    );

    return {
      ok: true,
      value: {
        publicCode: placed.order.publicCode,
        subtotal: placed.subtotal,
        shippingCost: placed.shippingCost,
        total: placed.total,
        fulfillmentMethod: input.fulfillmentMethod,
        paymentMethod: input.paymentMethod,
        transferAlias: input.paymentMethod === "transfer" ? store.transferAlias : null,
        whatsAppUrl,
      },
    };
  } catch (error) {
    if (error instanceof CheckoutRejected) {
      return fail(error.code, error.message);
    }
    if (isUniqueViolation(error)) {
      return fail("cart_already_ordered", "Este carrito ya se convirtió en un pedido.");
    }
    throw error;
  }
}

class CheckoutRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function readCustomer(input: PlaceOrderInput): ServiceResult<{ name: string; phone: string; email?: string }> {
  const name = input.customerName.trim();
  const phone = input.customerPhone.replace(/[^\d]/g, "");
  const email = input.customerEmail?.trim();

  if (name.length < 2 || name.length > 120) {
    return fail("invalid_customer", "Ingresá tu nombre.");
  }
  if (!/^[1-9]\d{7,14}$/.test(phone)) {
    return fail("invalid_customer", "Ingresá un teléfono válido, con código de área.");
  }
  if (email && (email.length > 254 || !email.includes("@"))) {
    return fail("invalid_customer", "El email no es válido.");
  }

  return { ok: true, value: { name, phone, email: email || undefined } };
}
