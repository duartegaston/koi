"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitCheckout, type CheckoutState, type DeliveryQuoteView } from "@/actions/checkout";
import { AddressSuggest } from "@/components/forms/address-suggest";
import { cartEmptiedByCustomer, useLiveCart } from "@/components/layout/cart-store";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField } from "@/components/ui/field";
import { type CartSnapshot } from "@/lib/cart-types";
import { availabilityNote } from "@/lib/order-limits";
import { mercadoPagoOffered } from "@/lib/payment-options";
import { mapLink } from "@/lib/geo";
import { addAmounts, formatArs } from "@/lib/money";
import { deliveriesPausedNotice } from "@/lib/site";

const idleCheckoutState: CheckoutState = { status: "idle" };

type StoreView = {
  city: string;
  province: string;
  pickupAddress: string | null;
  transferAlias: string | null;
  deliveryConfigured: boolean;
  mercadoPagoConfigured: boolean;
  deliveriesPaused: boolean;
};

export function CheckoutForm({
  cart,
  store,
  storeError,
}: {
  cart: CartSnapshot;
  store: StoreView | null;
  storeError: string | null;
}) {
  const liveCart = useLiveCart(cart);
  const router = useRouter();
  const [state, action] = useActionState(submitCheckout, idleCheckoutState);
  const cartIsEmpty = liveCart.itemCount === 0;
  const leaving = cartIsEmpty && cartEmptiedByCustomer();

  useEffect(() => {
    if (!leaving) return;
    router.replace("/tienda");
  }, [leaving, router]);

  if (storeError || !store) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState title="El local no está listo" body={storeError ?? "No pudimos cargar los datos del local."} />
      </div>
    );
  }

  if (cartIsEmpty) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState title="El carrito está vacío" body="Agregá un producto para armar el pedido." />
        <p className="mt-6 text-center">
          <Link href="/tienda" className="text-sm underline underline-offset-4">
            Ver la tienda
          </Link>
        </p>
      </div>
    );
  }

  return <CheckoutFields cart={liveCart} store={store} state={state} action={action} />;
}

function CheckoutFields({
  cart,
  store,
  state,
  action,
}: {
  cart: CartSnapshot;
  store: StoreView;
  state: CheckoutState;
  action: (payload: FormData) => void;
}) {
  const canPickup = Boolean(store.pickupAddress);
  const canDeliver = store.deliveryConfigured;
  const canTransfer = Boolean(store.transferAlias);
  const canMercadoPago = mercadoPagoOffered && store.mercadoPagoConfigured;
  const initialFulfillment = canPickup ? "pickup" : "motorcycle";
  const [fulfillment, setFulfillment] = useState<"motorcycle" | "pickup">(initialFulfillment);
  const [payment, setPayment] = useState<"mercadopago" | "transfer" | "cash">(
    initialFulfillment === "motorcycle"
      ? "transfer"
      : canMercadoPago
        ? "mercadopago"
        : canTransfer
          ? "transfer"
          : "cash",
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [addressDirty, setAddressDirty] = useState(false);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const blocked = cart.lines.some((line) => line.problem);
  const canPay =
    fulfillment === "motorcycle"
      ? payment === "transfer" && canTransfer
      : (payment === "mercadopago" && canMercadoPago) ||
        (payment === "transfer" && canTransfer) ||
        (payment === "cash" && canPickup);

  function selectFulfillment(next: "motorcycle" | "pickup") {
    setFulfillment(next);
    if (next === "motorcycle") {
      setPayment("transfer");
    }
  }

  useEffect(() => {
    if (state.status === "quoted") setAddressDirty(false);
  }, [state]);

  const quote =
    fulfillment === "motorcycle" && !addressDirty
      ? state.status === "quoted"
        ? state.quote
        : state.status === "error"
          ? state.quote
          : undefined
      : undefined;

  const shipping = fulfillment === "pickup" ? "0.00" : quote?.price;
  const total = shipping ? addAmounts(cart.subtotal, shipping) : null;

  if (!canPickup && !canDeliver) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState
          title="Todavía no se puede pedir"
          body="El local no tiene configurado el retiro ni el envío."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-16">
      <form action={action} className="space-y-10" noValidate>
        <div>
          <h1 className="text-5xl">Checkout</h1>
          <p className="mt-3 text-base text-muted">
            {store.city}, {store.province}. El envío es solo dentro de la ciudad.
          </p>
        </div>

        <fieldset className="space-y-4">
          <legend className="font-label text-sm tracking-wide text-muted">Tus datos</legend>
          <InputField
            label="Nombre"
            name="customerName"
            autoComplete="name"
            required
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            errors={errors?.customerName}
          />
          <InputField
            label="Teléfono"
            name="customerPhone"
            type="tel"
            autoComplete="tel"
            required
            inputMode="tel"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            errors={errors?.customerPhone}
          />
          <InputField
            label="Email (opcional)"
            name="customerEmail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            errors={errors?.customerEmail}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-label text-sm tracking-wide text-muted">Entrega</legend>
          {store.deliveriesPaused ? (
            <p role="status" className="border border-line bg-surface px-4 py-3 text-sm leading-relaxed">
              {deliveriesPausedNotice}
            </p>
          ) : null}
          {canDeliver ? (
            <Radio
              name="fulfillmentMethod"
              value="motorcycle"
              checked={fulfillment === "motorcycle"}
              onChange={() => selectFulfillment("motorcycle")}
              label="Envío"
            />
          ) : (
            <p className="text-sm text-muted">El envío todavía no está disponible.</p>
          )}
          {canPickup ? (
            <Radio
              name="fulfillmentMethod"
              value="pickup"
              checked={fulfillment === "pickup"}
              onChange={() => selectFulfillment("pickup")}
              label="Retiro en el local"
            />
          ) : null}
          {errors?.fulfillmentMethod?.[0] ? <p className="text-sm">{errors.fulfillmentMethod[0]}</p> : null}

          {fulfillment === "pickup" && store.pickupAddress ? (
            <p className="border border-line px-4 py-3 text-sm">Retirás en {store.pickupAddress}.</p>
          ) : null}

          {fulfillment === "motorcycle" ? (
            <div className="space-y-3 pt-2">
              <AddressSuggest
                value={address}
                onChange={(next) => {
                  setAddress(next);
                  setAddressDirty(true);
                }}
                errors={errors?.address}
              />
              <IntentButton intent="quote" variant="secondary">
                Calcular envío
              </IntentButton>
              {quote ? <QuoteSummary quote={quote} /> : null}
            </div>
          ) : (
            <input type="hidden" name="address" value="" />
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-label text-sm tracking-wide text-muted">Pago</legend>
          {fulfillment === "motorcycle" ? (
            <p className="text-sm text-muted">El envío se paga por transferencia.</p>
          ) : null}
          {fulfillment === "pickup" && mercadoPagoOffered ? (
            canMercadoPago ? (
              <Radio
                name="paymentMethod"
                value="mercadopago"
                checked={payment === "mercadopago"}
                onChange={() => setPayment("mercadopago")}
                label="Mercado Pago"
              />
            ) : (
              <p className="text-sm text-muted">Mercado Pago todavía no está disponible.</p>
            )
          ) : null}
          {canTransfer ? (
            <Radio
              name="paymentMethod"
              value="transfer"
              checked={payment === "transfer"}
              onChange={() => setPayment("transfer")}
              label="Transferencia"
            />
          ) : (
            <p className="text-sm text-muted">La transferencia todavía no tiene un alias cargado.</p>
          )}
          {fulfillment === "pickup" ? (
            <Radio
              name="paymentMethod"
              value="cash"
              checked={payment === "cash"}
              onChange={() => setPayment("cash")}
              label="Efectivo al retirar"
            />
          ) : null}
          {payment === "transfer" && store.transferAlias ? (
            <p className="border border-line px-4 py-3 text-sm">Alias: {store.transferAlias}</p>
          ) : null}
          {payment === "cash" ? (
            <p className="border border-line px-4 py-3 text-sm">Pagás en efectivo cuando retirás en el local.</p>
          ) : null}
          {errors?.paymentMethod?.[0] ? <p className="text-sm">{errors.paymentMethod[0]}</p> : null}
        </fieldset>

        {state.status === "error" ? (
          <p role="alert" className="border border-line px-4 py-3 text-sm">
            {state.message}
          </p>
        ) : null}
        {blocked ? (
          <p className="text-sm" role="status">
            Hay productos que ya no se pueden pedir en esa cantidad. Ajustá el carrito antes de confirmar.
          </p>
        ) : null}

        <IntentButton intent="place" disabled={blocked || !canPay}>
          {payment === "mercadopago" && canMercadoPago ? "Continuar al pago" : "Confirmar pedido"}
        </IntentButton>
      </form>

      <aside className="h-fit border border-line p-5 lg:sticky lg:top-24">
        <h2 className="font-label text-sm tracking-wide text-muted">Tu pedido</h2>
        <ul className="mt-4 divide-y divide-line">
          {cart.lines.map((line) => (
            <li key={line.productId} className="flex items-start justify-between gap-4 py-3 text-sm">
              <span>
                {line.quantity} × {line.name}
                {line.problem ? <span className="mt-1 block text-xs">Revisá esta línea en el carrito.</span> : null}
                {availabilityNote(line.quantity, line.stock) ? (
                  <span className="mt-1 block text-xs">{availabilityNote(line.quantity, line.stock)}</span>
                ) : null}
              </span>
              <span>{formatArs(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatArs(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{shipping ? formatArs(shipping) : "A calcular"}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base">
            <dt>Total</dt>
            <dd>{total ? formatArs(total) : "—"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function QuoteSummary({ quote }: { quote: DeliveryQuoteView }) {
  const kilometers = Number(quote.distanceKm);
  const distance = Number.isFinite(kilometers)
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(kilometers)
    : null;
  const mapUrl = mapLink(Number(quote.latitude), Number(quote.longitude));

  return (
    <div className="border border-line px-4 py-3 text-sm" role="status">
      <p>Escribiste: {quote.enteredAddress}</p>
      <p className="mt-2">La ubicamos en: {quote.formattedAddress}</p>
      {mapUrl ? (
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex underline underline-offset-4">
          Ver en el mapa
        </a>
      ) : null}
      <p className="mt-2 text-muted">
        {quote.zoneName}
        {distance ? ` · ${distance} km` : ""} · {formatArs(quote.price)}
      </p>
    </div>
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-line px-4 py-3 text-sm has-[:checked]:border-foreground">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="h-4 w-4 accent-foreground" />
      {label}
    </label>
  );
}

function IntentButton({
  intent,
  children,
  variant = "primary",
  disabled = false,
}: {
  intent: "quote" | "place";
  children: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { pending, data } = useFormStatus();
  const active = pending && data?.get("intent") === intent;
  const label = intent === "quote" ? "Calculando…" : "Confirmando…";

  return (
    <Button type="submit" name="intent" value={intent} variant={variant} disabled={disabled || pending}>
      {active ? label : children}
    </Button>
  );
}
