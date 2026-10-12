import type { Metadata } from "next";
import Link from "next/link";
import { findPaymentByOrderId } from "@/data-access/payment.repository";
import { findOrderByPublicCode } from "@/data-access/order.repository";

export const metadata: Metadata = { title: "Pago" };
export const dynamic = "force-dynamic";

const publicCodePattern = /^KOI-[A-Z0-9]{8}$/;

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; resultado?: string }>;
}) {
  const params = await searchParams;
  const publicCode = params.pedido?.trim().toUpperCase() ?? "";
  const hint = params.resultado === "ok" || params.resultado === "error" || params.resultado === "pendiente" ? params.resultado : null;
  const payment = publicCodePattern.test(publicCode) ? await readPayment(publicCode) : null;
  const copy = paymentCopy(payment, hint);

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <p className="font-label text-sm tracking-wide text-muted">Pago</p>
      <h1 className="mt-3 text-4xl leading-none md:text-5xl">{publicCodePattern.test(publicCode) ? publicCode : "Mercado Pago"}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">{copy}</p>
      <p className="mt-8">
        <Link href="/" className="text-sm underline underline-offset-4">
          Volver a la tienda
        </Link>
      </p>
    </section>
  );
}

async function readPayment(publicCode: string) {
  const order = await findOrderByPublicCode(publicCode);
  if (!order || order.paymentMethod !== "mercadopago") return null;
  const payment = await findPaymentByOrderId(order.id);
  if (!payment) return null;
  return payment.status;
}

function paymentCopy(status: "pending" | "approved" | "rejected" | null, hint: "ok" | "error" | "pendiente" | null): string {
  if (status === "approved") {
    return "El pago quedó acreditado. El local confirma el pedido y descuenta el stock al aprobarlo.";
  }
  if (status === "rejected") {
    return "El pago fue rechazado. Podés hacer otro pedido desde la tienda.";
  }
  if (hint === "error") {
    return "El pago no se completó. El pedido sigue anotado hasta que el local lo cancele.";
  }
  if (hint === "pendiente" || status === "pending") {
    return "El pago sigue pendiente. Cuando Mercado Pago lo acredite, el local lo va a ver en el pedido.";
  }
  return "Cuando Mercado Pago acredite el pago, el local lo va a ver en el pedido.";
}
