"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { normalizeOrderCode, ordersPath } from "@/lib/admin-orders";

type FilterOption = { value: string; label: string };

export function OrderFilters({
  status,
  paymentMethod,
  code,
  statuses,
  methods,
}: {
  status?: string;
  paymentMethod?: string;
  code?: string;
  statuses: FilterOption[];
  methods: FilterOption[];
}) {
  const router = useRouter();
  const timer = useRef<number | undefined>(undefined);
  const [codeValue, setCodeValue] = useState(code ?? "");
  const urlCode = code ?? "";
  const hasFilters = Boolean(status || paymentMethod || code);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    setCodeValue((current) => {
      const typed = normalizeOrderCode(current) ?? "";
      if (typed === urlCode) return current;
      if (urlCode && typed.startsWith(urlCode)) return current;
      return urlCode;
    });
  }, [urlCode]);

  function apply(next: { status?: string; paymentMethod?: string; code?: string }) {
    router.replace(ordersPath(next));
  }

  return (
    <div className="grid gap-3">
      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="block font-medium">Estado</span>
          <select
            name="status"
            value={status ?? ""}
            className="h-11 w-full border border-line bg-background px-3"
            onChange={(event) =>
              apply({
                status: event.target.value || undefined,
                paymentMethod,
                code: normalizeOrderCode(codeValue),
              })
            }
          >
            <option value="">Todos</option>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="block font-medium">Pago</span>
          <select
            name="paymentMethod"
            value={paymentMethod ?? ""}
            className="h-11 w-full border border-line bg-background px-3"
            onChange={(event) =>
              apply({
                status,
                paymentMethod: event.target.value || undefined,
                code: normalizeOrderCode(codeValue),
              })
            }
          >
            <option value="">Todos</option>
            {methods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="block font-medium">Código</span>
          <input
            name="code"
            value={codeValue}
            autoCapitalize="characters"
            spellCheck={false}
            className="h-11 w-full border border-line bg-background px-3"
            onChange={(event) => {
              const next = normalizeOrderCode(event.target.value) ?? "";
              setCodeValue(next);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => {
                if (next === urlCode) return;
                apply({ status, paymentMethod, code: next || undefined });
              }, 300);
            }}
          />
        </label>
      </div>
      <div>
        <button
          type="button"
          className={buttonClass.secondary}
          disabled={!hasFilters}
          onClick={() => {
            setCodeValue("");
            router.replace("/admin/pedidos");
          }}
        >
          Borrar filtros
        </button>
      </div>
    </div>
  );
}
