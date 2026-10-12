"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { setCartQuantity, type CartActionState } from "@/actions/cart";
import { ProductImage } from "@/components/product/product-image";
import { buttonClass } from "@/components/ui/button";
import type { CartLineSnapshot, CartSnapshot } from "@/lib/cart-types";
import { formatArs } from "@/lib/money";
import { cn } from "@/lib/utils";

const idleCartState: CartActionState = { status: "idle" };

export function CartDrawer({ cart }: { cart: CartSnapshot }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousCount = useRef(cart.itemCount);
  const [open, setOpen] = useState(false);

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
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label={cart.itemCount > 0 ? `Abrir carrito, ${countLabel}` : "Abrir carrito"}
        onClick={() => setOpen(true)}
      >
        <CartIcon />
        {cart.itemCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-xs leading-none text-ink ring-2 ring-background">
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
            <h2 id="cart-title" className="font-sans text-sm font-medium uppercase tracking-[0.2em]">
              Carrito
            </h2>
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Cerrar carrito" onClick={() => setOpen(false)}>
              <CloseIcon />
            </button>
          </div>

          {cart.lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
              <p>El carrito está vacío.</p>
              <Link href="/" className="text-sm underline underline-offset-4" onClick={() => setOpen(false)}>
                Ver la tienda
              </Link>
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
  const [state, action] = useActionState(setCartQuantity, idleCartState);
  const problem =
    line.problem === "unavailable"
      ? "Ya no está disponible."
      : line.problem === "exceeds_limit"
        ? "La cantidad supera lo que podés pedir."
        : null;

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
          <p className="text-sm">{formatArs(line.lineTotal)}</p>
        </div>
        <p className="mt-1 text-xs text-muted">{formatArs(line.unitPrice)}</p>
        {problem ? <p className="mt-2 text-sm">{problem}</p> : null}
        {state.status === "error" ? (
          <p className="mt-2 text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <form action={action}>
            <input type="hidden" name="productId" value={line.productId} />
            <input type="hidden" name="quantity" value={String(Math.max(0, line.quantity - 1))} />
            <QuantityButton label={`Quitar uno de ${line.name}`}>−</QuantityButton>
          </form>
          <span className="min-w-6 text-center text-sm" aria-label={`Cantidad: ${line.quantity}`}>
            {line.quantity}
          </span>
          <form action={action}>
            <input type="hidden" name="productId" value={line.productId} />
            <input type="hidden" name="quantity" value={String(line.quantity + 1)} />
            <QuantityButton label={`Agregar uno de ${line.name}`} disabled={line.limit == null || line.quantity >= line.limit}>
              +
            </QuantityButton>
          </form>
          <form action={action} className="ml-auto">
            <input type="hidden" name="productId" value={line.productId} />
            <input type="hidden" name="quantity" value="0" />
            <RemoveButton name={line.name} />
          </form>
        </div>
      </div>
    </div>
  );
}

function QuantityButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={disabled || pending}
      className="inline-flex h-11 w-11 items-center justify-center border border-line text-lg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function RemoveButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={`Quitar ${name} del carrito`}
      disabled={pending}
      className="h-11 px-2 text-xs underline underline-offset-4 disabled:opacity-40"
    >
      {pending ? "Quitando…" : "Quitar"}
    </button>
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
