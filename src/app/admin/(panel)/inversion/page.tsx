import { AdminPage } from "@/components/admin/admin-page";
import { PurchaseCreateForm, PurchaseEditForm } from "@/components/forms/investment-forms";
import { formatArs } from "@/lib/money";
import { getInvestmentSummary, type InvestmentSummary } from "@/services/investment.service";

export default async function InvestmentPage() {
  const summary = await getInvestmentSummary();

  return (
    <AdminPage title="Inversión">
      <p className="max-w-xl text-sm leading-relaxed text-muted">
        Cargá lo que pagaste al proveedor. El saldo resta eso de los productos ya cobrados, en pedidos pagados y
        entregados. El envío no entra en la cuenta.
      </p>
      <InvestmentNumbers summary={summary} />
      <div className="mt-10">
        <PurchaseCreateForm key={summary.purchases[0]?.id ?? "new"} defaultDate={todayInBuenosAires()} />
      </div>
      {summary.purchases.length > 0 ? (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {summary.purchases.map((purchase) => (
            <PurchaseEditForm key={purchase.id} purchase={purchase} />
          ))}
        </ul>
      ) : null}
    </AdminPage>
  );
}

function InvestmentNumbers({ summary }: { summary: InvestmentSummary }) {
  return (
    <dl className="mt-8 grid gap-4 sm:grid-cols-3">
      <NumberCard label="Invertido" value={formatArs(summary.invested)} />
      <NumberCard label="Recuperado" value={formatArs(summary.recovered)} />
      <NumberCard label={balanceCaption(summary)} value={formatArs(summary.balance)} />
    </dl>
  );
}

function NumberCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-surface px-5 py-6">
      <dt className="font-label text-sm tracking-wide text-muted">{label}</dt>
      <dd className="mt-3 font-display text-3xl break-words sm:text-4xl">{value}</dd>
    </div>
  );
}

function balanceCaption(summary: InvestmentSummary): string {
  if (summary.balance.startsWith("-")) return "Falta recuperar";
  if (summary.invested === "0.00") return "Saldo";
  if (summary.balance === "0.00") return "Inversión recuperada";
  return "Recuperado de más";
}

function todayInBuenosAires(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
