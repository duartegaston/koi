"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setCartQuantity, type CartActionState } from "@/actions/cart";
import { ProductImage } from "@/components/product/product-image";
import { buttonClass } from "@/components/ui/button";
import type { CartLineSnapshot, CartSnapshot } from "@/lib/cart-types";
import { formatArs, multiplyAmount } from "@/lib/money";
import { availabilityNote } from "@/lib/order-limits";
import { cn } from "@/lib/utils";

const idleCartState: CartActionState = { status: "idle" };

export function CartDrawer({ cart }: { cart: CartSnapshot }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousCount = useRef(cart.itemCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (cart.itemCount > previousCount.current) setOpen(true);
    previousCount.current = cart.itemCount;
  }, [cart.itemCount]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const blocked = cart.lines.some((line) => line.problem);
  const countLabel = cart.itemCount === 1 ? "1 producto" : `${cart.itemCount} productos`;

  return (
    <>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={cart.itemCount > 0 ? `Abrir carrito, ${countLabel}` : "Abrir carrito"}
        onClick={() => setOpen(true)}
      >
        <CartIcon />
        {cart.itemCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 font-label text-xs leading-none text-paper ring-2 ring-ink">
            {cart.itemCount}
          </span>
        ) : null}
      </button>
      <dialog
        ref={dialogRef}
        className="cart-dialog"
        aria-labelledby="cart-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (!clickInside(event)) setOpen(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5">
            <h2 id="cart-title" className="font-label text-sm font-medium tracking-wide">
              Carrito
            </h2>
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Cerrar carrito" onClick={() => setOpen(false)}>
              <CloseIcon />
            </button>
          </div>

          {cart.lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
              <p>El carrito está vacío.</p>
              <a
                href="/tienda"
                className="text-sm underline underline-offset-4"
                onClick={() => {
                  window.location.assign("/tienda");
                }}
              >
                Ver la tienda
              </a>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-line overflow-y-auto">
                {cart.lines.map((line) => (
                  <li key={line.productId}>
                    <CartLine line={line} />
                  </li>
                ))}
              </ul>
              <div className="space-y-4 border-t border-line p-5">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatArs(cart.subtotal)}</span>
                </div>
                {blocked ? (
                  <p className="text-sm" role="status">
                    Hay productos que ya no se pueden pedir en esa cantidad. Ajustá el carrito para continuar.
                  </p>
                ) : null}
                <Link
                  href="/checkout"
                  aria-disabled={blocked}
                  className={cn(buttonClass.primary, "w-full", blocked && "pointer-events-none opacity-50")}
                  onClick={() => setOpen(false)}
                >
                  Continuar
                </Link>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function CartLine({ line }: { line: CartLineSnapshot }) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const desired = useRef(line.quantity);
  const acked = useRef(line.quantity);
  const flight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problem =
    line.problem === "unavailable"
      ? "Ya no está disponible."
      : line.problem === "exceeds_limit"
        ? "La cantidad supera lo que podés pedir."
        : null;
  const note = availabilityNote(quantity, line.stock);
  const atCap = line.limit == null || quantity >= line.limit;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (flight.current || timer.current) return;
    if (line.quantity !== acked.current && desired.current !== line.quantity) return;
    setQuantity(line.quantity);
    desired.current = line.quantity;
    acked.current = line.quantity;
    setRemoved(false);
  }, [line.productId, line.quantity]);

  function schedule(next: number, immediate = false) {
    const clamped = line.limit == null ? Math.max(0, next) : Math.min(Math.max(0, next), line.limit);
    setQuantity(clamped);
    desired.current = clamped;
    setError(null);
    if (clamped === 0) setRemoved(true);
    if (timer.current) clearTimeout(timer.current);
    const run = () => {
      timer.current = null;
      void sync();
    };
    if (immediate) run();
    else timer.current = setTimeout(run, 180);
  }

  async function sync() {
    if (flight.current) {
      await flight.current;
      if (desired.current !== acked.current) await sync();
      return;
    }

    const job = (async () => {
      while (desired.current !== acked.current) {
        const value = desired.current;
        const data = new FormData();
        data.set("productId", line.productId);
        data.set("quantity", String(value));
        const result = await setCartQuantity(idleCartState, data);
        if (result.status === "error") {
          setError(result.message);
          setRemoved(false);
          setQuantity(acked.current);
          desired.current = acked.current;
          return;
        }
        acked.current = value;
      }
    })();

    flight.current = job;
    try {
      await job;
    } finally {
      flight.current = null;
    }
  }

  if (removed) return null;

  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-4 px-5 py-4">
      <Link href={`/producto/${line.slug}`} className="relative block aspect-[3/4] bg-surface">
        <ProductImage src={line.imageUrl} alt="" />
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/producto/${line.slug}`} className="text-sm tracking-tight">
            {line.name}
          </Link>
          <p className="text-sm">{formatArs(multiplyAmount(line.unitPrice, quantity))}</p>
        </div>
        <p className="mt-1 text-xs text-muted">{formatArs(line.unitPrice)}</p>
        {problem ? <p className="mt-2 text-sm">{problem}</p> : null}
        {note ? (
          <p role="status" className="mt-2 text-sm">
            {note}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <button
            type="button"
            aria-label={`Quitar uno de ${line.name}`}
            onClick={() => schedule(desired.current - 1)}
            className="inline-flex h-11 w-11 items-center justify-center border border-line text-lg"
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm tabular-nums" aria-live="polite" aria-label={`Cantidad: ${quantity}`}>
            {quantity}
          </span>
          <button
            type="button"
            aria-label={`Agregar uno de ${line.name}`}
            disabled={atCap}
            onClick={() => schedule(desired.current + 1)}
            className="inline-flex h-11 w-11 items-center justify-center border border-line text-lg disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            aria-label={`Quitar ${line.name} del carrito`}
            onClick={() => schedule(0, true)}
            className="ml-auto h-11 px-2 text-xs underline underline-offset-4"
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}

function clickInside(event: React.MouseEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 5h12l-1 9H6L4 5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 5 3 2H1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="14" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
