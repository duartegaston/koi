"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { setCartQuantity, type CartActionState } from "@/actions/cart";
import { onCartAdded } from "@/components/layout/cart-feedback";
import { ProductImage } from "@/components/product/product-image";
import { buttonClass } from "@/components/ui/button";
import type { CartLineSnapshot, CartSnapshot } from "@/lib/cart-types";
import {
  beginCartWrite,
  endCartWrite,
  publishCart,
  readCart,
  rememberDisplayed,
  rollbackCart,
  useLiveCart,
  withLineQuantity,
} from "@/components/layout/cart-store";
import { addAmounts, formatArs, multiplyAmount } from "@/lib/money";
import { availabilityNote } from "@/lib/order-limits";
import { cn } from "@/lib/utils";

const idleCartState: CartActionState = { status: "idle" };
const TOAST_MS = 4200;

export function CartDrawer({ cart: serverCart }: { cart: CartSnapshot }) {
  const cart = useLiveCart(serverCart);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousCount = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const [toast, setToast] = useState<{ id: number; productName: string } | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const toastTitleId = useId();

  useEffect(() => {
    setQuantities((current) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [productId, quantity] of Object.entries(current)) {
        const line = cart.lines.find((item) => item.productId === productId);
        if (!line || line.quantity === quantity) {
          changed = true;
          continue;
        }
        next[productId] = quantity;
      }
      return changed ? next : current;
    });
  }, [cart.lines]);

  const onQuantity = useCallback((productId: string, quantity: number) => {
    setQuantities((current) => {
      const line = cart.lines.find((item) => item.productId === productId);
      if (line && line.quantity === quantity) {
        if (!(productId in current)) return current;
        const next = { ...current };
        delete next[productId];
        return next;
      }
      if (current[productId] === quantity) return current;
      return { ...current, [productId]: quantity };
    });
  }, [cart.lines]);

  const shownLines = cart.lines.map((line) => {
    const quantity = quantities[line.productId] ?? line.quantity;
    return { ...line, quantity, lineTotal: multiplyAmount(line.unitPrice, quantity) };
  });
  const visibleLines = shownLines.filter((line) => line.quantity > 0);
  const itemCount = visibleLines.reduce((count, line) => count + line.quantity, 0);
  const subtotal = visibleLines.reduce((sum, line) => addAmounts(sum, line.lineTotal), "0.00");
  rememberDisplayed({ lines: shownLines, itemCount, subtotal });

  useEffect(() => {
    setOpen(false);
    setToast(null);
  }, [pathname]);

  useEffect(() => {
    if (previousCount.current === null) {
      previousCount.current = itemCount;
      return;
    }
    if (itemCount > previousCount.current) {
      setBadgePulse(true);
      const timer = setTimeout(() => setBadgePulse(false), 600);
      previousCount.current = itemCount;
      return () => clearTimeout(timer);
    }
    previousCount.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    return onCartAdded(({ productName }) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ id: Date.now(), productName });
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.focus({ preventScroll: true });
      setToast(null);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const blocked = visibleLines.some((line) => line.problem);
  const countLabel = itemCount === 1 ? "1 producto" : `${itemCount} productos`;

  return (
    <>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={itemCount > 0 ? `Abrir carrito, ${countLabel}` : "Abrir carrito"}
        onClick={() => setOpen(true)}
      >
        <CartIcon />
        {itemCount > 0 ? (
          <span
            className={cn(
              "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 font-label text-xs leading-none text-paper ring-2 ring-ink",
              badgePulse && "cart-badge-pulse",
            )}
          >
            {itemCount}
          </span>
        ) : null}
      </button>
      {toast && !open ? (
        <div
          role="status"
          aria-labelledby={toastTitleId}
          className="cart-toast fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 border border-line bg-paper px-4 py-3 shadow-sm md:inset-x-auto md:right-6 md:bottom-6"
        >
          <p id={toastTitleId} className="min-w-0 flex-1 text-sm leading-snug">
            Agregaste <span className="font-medium">{toast.productName}</span>
          </p>
          <button
            type="button"
            className="shrink-0 font-label text-sm font-medium underline underline-offset-4"
            onClick={() => setOpen(true)}
          >
            Ver carrito
          </button>
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        tabIndex={-1}
        className="cart-dialog"
        aria-labelledby="cart-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5">
            <h2 id="cart-title" className="font-label text-sm font-medium tracking-wide">
              Carrito
            </h2>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Cerrar carrito"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <ul hidden={visibleLines.length === 0} className="flex-1 divide-y divide-line overflow-y-auto">
            {visibleLines.map((line) => (
              <li key={line.productId}>
                <CartLine line={line} onQuantity={onQuantity} />
              </li>
            ))}
          </ul>
          {visibleLines.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
              <p>El carrito está vacío.</p>
              <Link
                href="/tienda"
                className="text-sm underline underline-offset-4"
                onClick={() => setOpen(false)}
              >
                Ver la tienda
              </Link>
            </div>
          ) : (
            <div className="space-y-3 border-t border-line p-5">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatArs(subtotal)}</span>
              </div>
              {blocked ? (
                <p className="text-sm" role="status">
                  Hay productos que ya no se pueden pedir en esa cantidad. Ajustá el carrito para continuar.
                </p>
              ) : null}
              <Link
                href="/checkout"
                prefetch={false}
                aria-disabled={blocked}
                className={cn(buttonClass.primary, "w-full", blocked && "pointer-events-none opacity-50")}
                onClick={() => setOpen(false)}
              >
                Finalizar compra
              </Link>
              <Link
                href="/tienda"
                className={cn(buttonClass.secondary, "w-full")}
                onClick={() => setOpen(false)}
              >
                Seguir comprando
              </Link>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

function CartLine({
  line,
  onQuantity,
}: {
  line: CartLineSnapshot;
  onQuantity: (productId: string, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const desired = useRef(line.quantity);
  const acked = useRef(line.quantity);
  const flight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseline = useRef<ReturnType<typeof readCart> | null>(null);
  const writtenAt = useRef(0);
  const locked = useRef(false);
  const seenServerQuantity = useRef(line.quantity);
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
    if (line.quantity === seenServerQuantity.current) return;
    seenServerQuantity.current = line.quantity;
    if (flight.current || timer.current || desired.current !== acked.current) return;
    setQuantity(line.quantity);
    desired.current = line.quantity;
    acked.current = line.quantity;
    setRemoved(line.quantity === 0);
    onQuantity(line.productId, line.quantity);
  }, [line.productId, line.quantity, onQuantity]);

  function lockWrite() {
    if (locked.current) return;
    baseline.current = readCart();
    beginCartWrite();
    locked.current = true;
  }

  function unlockWrite() {
    if (!locked.current) return;
    locked.current = false;
    baseline.current = null;
    endCartWrite();
  }

  function schedule(next: number, immediate = false) {
    const clamped = line.limit == null ? Math.max(0, next) : Math.min(Math.max(0, next), line.limit);
    setQuantity(clamped);
    desired.current = clamped;
    setError(null);
    if (clamped === 0) setRemoved(true);
    onQuantity(line.productId, clamped);
    lockWrite();
    writtenAt.current = publishCart(withLineQuantity(readCart(), line.productId, clamped));
    if (timer.current) clearTimeout(timer.current);
    const run = () => {
      timer.current = null;
      void sync();
    };
    if (immediate || clamped === 0) run();
    else timer.current = setTimeout(run, 180);
  }

  async function sync() {
    if (flight.current) {
      await flight.current;
      if (desired.current !== acked.current) await sync();
      return;
    }

    const job = (async () => {
      try {
        while (desired.current !== acked.current) {
          const value = desired.current;
          const data = new FormData();
          data.set("productId", line.productId);
          data.set("quantity", String(value));
          const result = await setCartQuantity(idleCartState, data);
          if (result.status === "error") {
            if (baseline.current) rollbackCart(writtenAt.current, baseline.current);
            setError(result.message);
            setRemoved(false);
            setQuantity(acked.current);
            desired.current = acked.current;
            onQuantity(line.productId, acked.current);
            return;
          }
          acked.current = value;
          seenServerQuantity.current = value;
        }
      } catch {
        if (baseline.current) rollbackCart(writtenAt.current, baseline.current);
        desired.current = acked.current;
      }
    })();

    flight.current = job;
    try {
      await job;
    } finally {
      flight.current = null;
      if (desired.current === acked.current) unlockWrite();
    }
  }

  if (removed) return null;

  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-4 px-5 py-4">
      <Link href={`/producto/${line.slug}`} className="relative block aspect-[3/4] bg-surface">
        <ProductImage src={line.imageUrl} alt="" muted={line.stock <= 0} />
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
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
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
