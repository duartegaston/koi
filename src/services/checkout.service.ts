import "server-only";

import { findCart, listCartLines, setCartStatus } from "@/data-access/cart.repository";
import { isUniqueViolation, transaction } from "@/data-access/executor";
import {
  cancelPendingOrder,
  insertOrder,
  insertOrderItems,
  type FulfillmentMethod,
  type PaymentMethod,
} from "@/data-access/order.repository";
import { insertPayment, savePaymentResult } from "@/data-access/payment.repository";
import { mapLink } from "@/lib/geo";
import { addAmounts, multiplyAmount, toCents } from "@/lib/money";
import { getServerEnv } from "@/lib/env";
import { mercadoPagoOffered } from "@/lib/payment-options";
import { readStoreConfig } from "@/lib/store-config";
import { orderWhatsAppText, whatsAppLink } from "@/lib/whatsapp/link";
import { readDeliveriesPaused } from "./store-settings.service";
import { toCartView } from "./cart.service";
import { openMercadoPagoCheckout } from "./mercadopago.service";
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
  addressLine: string | null;
  geocodedAddress: string | null;
  mapUrl: string | null;
  whatsAppUrl: string;
  checkoutUrl: string | null;
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

  const store = readStoreConfig();

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

  if (input.fulfillmentMethod === "motorcycle" && input.paymentMethod !== "transfer") {
    return fail("delivery_requires_transfer", "El envío se paga por transferencia.");
  }
  if (input.paymentMethod === "cash" && input.fulfillmentMethod !== "pickup") {
    return fail("cash_requires_pickup", "El efectivo es solo para retiro en el local.");
  }
  if (input.paymentMethod === "transfer" && !store.transferAlias) {
    return fail("transfer_alias_missing", "La transferencia todavía no tiene un alias cargado.");
  }
  if (input.paymentMethod === "mercadopago" && !mercadoPagoOffered) {
    return fail("mercadopago_unavailable", "Elegí transferencia o efectivo.");
  }
  if (input.paymentMethod === "mercadopago" && !store.mercadoPagoConfigured) {
    return fail("mercadopago_not_configured", "Mercado Pago todavía no está disponible.");
  }
  if (input.paymentMethod !== "transfer" && input.paymentMethod !== "mercadopago" && input.paymentMethod !== "cash") {
    return fail("payment_invalid", "Elegí transferencia o efectivo.");
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
          addressLine: delivery ? (input.address ?? "").trim() : undefined,
          geocodedAddress: delivery?.formattedAddress,
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
          madeToOrderQuantity: line.madeToOrder,
          lineTotal: multiplyAmount(line.unitPrice, line.quantity),
        })),
        tx,
      );
      const payment = await insertPayment(
        { orderId: order.id, provider: input.paymentMethod, amount: total, status: "pending" },
        tx,
      );
      await setCartStatus(input.cartId, "converted", tx);

      return { order, payment, lines: current.lines, subtotal, shippingCost, total };
    });

    let checkoutUrl: string | null = null;
    if (input.paymentMethod === "mercadopago") {
      const items = placed.lines.map((line) => ({
        id: line.productId,
        title: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }));
      if (toCents(placed.shippingCost) > 0) {
        items.push({ id: "envio", title: "Envío", quantity: 1, unitPrice: placed.shippingCost });
      }

      const preference = await openMercadoPagoCheckout({
        orderId: placed.order.id,
        publicCode: placed.order.publicCode,
        items,
        payerName: customer.value.name,
        payerEmail: customer.value.email,
      });
      if (!preference.ok) {
        await cancelPendingOrder(placed.order.id);
        await setCartStatus(input.cartId, "active");
        return preference;
      }
      try {
        await savePaymentResult(placed.payment.id, { externalId: preference.value.preferenceId, status: "pending" });
      } catch (error) {
        console.error(
          "No se pudo guardar la preferencia de Mercado Pago",
          error instanceof Error ? error.message : "error",
        );
      }
      checkoutUrl = preference.value.checkoutUrl;
    }

    const mapUrl = delivery ? mapLink(Number(delivery.latitude), Number(delivery.longitude)) : null;
    const enteredAddress = delivery ? (input.address ?? "").trim() : null;
    const deliveriesPaused = input.fulfillmentMethod === "motorcycle" ? await readDeliveriesPaused() : false;

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
          madeToOrder: line.madeToOrder,
        })),
        fulfillmentMethod: input.fulfillmentMethod,
        addressLine: enteredAddress,
        geocodedAddress: delivery?.formattedAddress ?? null,
        mapUrl,
        shippingCost: placed.shippingCost,
        total: placed.total,
        paymentMethod: input.paymentMethod,
        transferAlias: store.transferAlias,
        pickupAddress: store.pickupAddress,
        deliveriesPaused,
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
        addressLine: enteredAddress,
        geocodedAddress: delivery?.formattedAddress ?? null,
        mapUrl,
        whatsAppUrl,
        checkoutUrl,
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
