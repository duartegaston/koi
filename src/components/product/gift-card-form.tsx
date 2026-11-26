"use client";

import { useRef, useState } from "react";
import { addToCart } from "@/actions/cart";
import { notifyCartAdded } from "@/components/layout/cart-feedback";
import {
  beginCartWrite,
  endCartWrite,
  publishCart,
  readCart,
  rollbackCart,
  withAddedProduct,
} from "@/components/layout/cart-store";
import { Button } from "@/components/ui/button";
import {
  formatGiftAmount,
  giftAmountRangeLabel,
  giftCardPresets,
  parseGiftCardDetails,
} from "@/lib/gift-card";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full border border-line bg-background px-3 text-base outline-none transition focus:border-primary";

export function GiftCardForm({
  productId,
  name,
  slug,
  imageUrl,
  stock,
  categorySlug,
}: {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  stock: number;
  categorySlug: string;
}) {
  const [choice, setChoice] = useState<string>(giftCardPresets[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const choosingCustom = choice === "custom";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const data = new FormData(event.currentTarget);
    const parsed = parseGiftCardDetails({
      amount: choosingCustom ? customAmount : choice,
      recipientName: String(data.get("recipientName") ?? ""),
      recipientContact: String(data.get("recipientContact") ?? ""),
      giftMessage: String(data.get("giftMessage") ?? ""),
    });
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    sending.current = true;
    const previous = readCart();
    beginCartWrite();
    const writtenAt = publishCart(
      withAddedProduct(
        previous,
        {
          id: productId,
          name,
          slug,
          price: parsed.value.amount,
          stock,
          categorySlug,
          imageUrl,
          limit: 1,
          customAmount: true,
          giftRecipientName: parsed.value.recipientName,
        },
        1,
      ),
    );
    notifyCartAdded(name);

    data.set("productId", productId);
    data.set("quantity", "1");
    data.set("amount", parsed.value.amount);
    try {
      const result = await addToCart(data);
      if (result.status === "error") {
        rollbackCart(writtenAt, previous);
        setError(result.message);
      }
    } finally {
      endCartWrite();
      sending.current = false;
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <fieldset>
        <legend className="font-label text-sm font-medium">Monto</legend>
        <p className="mt-1 text-sm text-muted">{giftAmountRangeLabel()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {giftCardPresets.map((preset) => {
            const selected = choice === preset;
            return (
              <label
                key={preset}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center border px-3 text-sm tabular-nums",
                  selected ? "border-primary bg-surface" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name="amountChoice"
                  value={preset}
                  checked={selected}
                  onChange={() => setChoice(preset)}
                  className="sr-only"
                />
                {formatGiftAmount(preset)}
              </label>
            );
          })}
          <label
            className={cn(
              "inline-flex h-11 cursor-pointer items-center border px-3 text-sm",
              choosingCustom ? "border-primary bg-surface" : "border-line",
            )}
          >
            <input
              type="radio"
              name="amountChoice"
              value="custom"
              checked={choosingCustom}
              onChange={() => setChoice("custom")}
              className="sr-only"
            />
            Otro
          </label>
        </div>
        {choosingCustom ? (
          <div className="mt-3 space-y-1.5">
            <label htmlFor="customAmount" className="block font-label text-sm font-medium">
              Otro monto
            </label>
            <input
              id="customAmount"
              inputMode="numeric"
              autoComplete="off"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="35000"
              className={cn(fieldClass, "h-11")}
            />
          </div>
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="recipientName" className="block font-label text-sm font-medium">
          Nombre de quien recibe
        </label>
        <input
          id="recipientName"
          name="recipientName"
          required
          autoComplete="off"
          maxLength={120}
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="recipientContact" className="block font-label text-sm font-medium">
          Email o WhatsApp
        </label>
        <input
          id="recipientContact"
          name="recipientContact"
          required
          autoComplete="off"
          maxLength={254}
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="giftMessage" className="block font-label text-sm font-medium">
          Mensaje (opcional)
        </label>
        <textarea
          id="giftMessage"
          name="giftMessage"
          maxLength={500}
          rows={3}
          className={cn(fieldClass, "py-2")}
        />
      </div>
      <p className="text-sm text-muted">
        Cuando se acredite el pago, le escribimos por email o WhatsApp con la gift card.
      </p>
      <Button type="submit" className="w-full md:w-auto md:min-w-48">
        Agregar al carrito
      </Button>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
