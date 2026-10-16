import type { Metadata } from "next";
import Link from "next/link";
import { OrderPlaced } from "@/components/forms/order-placed";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { orderPublicCodePattern, readOrderGrant } from "@/lib/order-grant";
import { formatArs } from "@/lib/money";
import { safeMapUrl, safeMercadoPagoUrl, safeWhatsAppUrl } from "@/lib/safe-url";
import { readCheckoutReceipt } from "@/services/checkout.service";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrderPlacedPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const publicCode = codigo.trim().toUpperCase();
  const grant = orderPublicCodePattern.test(publicCode) ? await readOrderGrant(publicCode) : null;
  const receipt = grant ? await readCheckoutReceipt(publicCode) : null;

  if (!receipt) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState
          title="No encontramos el pedido"
          body="Si acabás de confirmarlo, abrí este enlace en el mismo navegador."
        />
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm underline underline-offset-4">
            Volver a la tienda
          </Link>
        </p>
      </div>
    );
  }

  const checkoutUrl = grant?.checkoutUrl ? safeMercadoPagoUrl(grant.checkoutUrl) : null;
  const whatsAppUrl = safeWhatsAppUrl(receipt.whatsAppUrl);
  const mapUrl = receipt.mapUrl ? safeMapUrl(receipt.mapUrl) : null;
  const payingOnline = receipt.paymentMethod === "mercadopago";
  const payingCash = receipt.paymentMethod === "cash";

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <OrderPlaced checkoutUrl={checkoutUrl} />
      <p className="font-label text-sm tracking-wide text-muted">{payingOnline ? "Pedido anotado" : "Pedido confirmado"}</p>
      <h1 className="mt-3 text-4xl leading-none md:text-5xl">{receipt.publicCode}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {receipt.fulfillmentMethod === "pickup"
          ? "El pedido queda para retirar en el local."
          : "El pedido incluye envío."}{" "}
        {payingOnline
          ? "Te estamos llevando a Mercado Pago. Si no abre, usá el botón de abajo."
          : payingCash
            ? "Pagás en efectivo al retirar. Enviá el pedido por WhatsApp para que el local lo anote."
            : "Enviá el comprobante de la transferencia por WhatsApp."}
      </p>
      {receipt.fulfillmentMethod === "motorcycle" && receipt.addressLine ? (
        <div className="mt-4 border border-line px-4 py-3 text-sm">
          <p>Escribiste: {receipt.addressLine}</p>
          {receipt.geocodedAddress ? <p className="mt-2">La ubicamos en: {receipt.geocodedAddress}</p> : null}
          {mapUrl ? (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex underline underline-offset-4">
              Ver en el mapa
            </a>
          ) : null}
        </div>
      ) : null}
      {receipt.paymentMethod === "transfer" && receipt.transferAlias ? (
        <p className="mt-4 border border-line px-4 py-3 text-sm">Alias: {receipt.transferAlias}</p>
      ) : null}
      <dl className="mt-8 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatArs(receipt.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>{formatArs(receipt.shippingCost)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base">
          <dt>Total</dt>
          <dd>{formatArs(receipt.total)}</dd>
        </div>
      </dl>
      {checkoutUrl ? (
        <a href={checkoutUrl} className={`${buttonClass.primary} mt-8 w-full`}>
          Pagar con Mercado Pago
        </a>
      ) : null}
      {whatsAppUrl ? (
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={checkoutUrl ? `${buttonClass.secondary} mt-3 w-full` : `${buttonClass.primary} mt-8 w-full`}
        >
          {checkoutUrl ? "Avisar al local por WhatsApp" : "Enviar pedido por WhatsApp"}
        </a>
      ) : null}
      <p className="mt-6">
        <Link href="/" className="text-sm underline underline-offset-4">
          Volver a la tienda
        </Link>
      </p>
    </section>
  );
}
