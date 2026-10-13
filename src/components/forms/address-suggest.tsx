"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InputField } from "@/components/ui/field";
import { houseNumber, streetSearchText } from "@/lib/geocoding/address-query";

type Suggestion = { id: string; label: string };

export function AddressSuggest({
  value,
  onChange,
  errors,
}: {
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const picked = useRef(value);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const activeSuggestion = suggestions[active];
  const needsHeight = !houseNumber(value);
  const activeId = open && status === "ready" && activeSuggestion ? `${listId}-${active}` : undefined;

  useEffect(() => {
    if (value === picked.current) {
      setOpen(false);
      return;
    }

    const street = streetSearchText(value);
    if (street.length < 3) {
      setSuggestions([]);
      setStatus("idle");
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadSuggestions(value, controller.signal);
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };

    async function loadSuggestions(query: string, signal: AbortSignal) {
      setStatus("loading");
      setOpen(true);
      try {
        const response = await fetch(`/api/direcciones?q=${encodeURIComponent(query)}`, { signal });
        if (!response.ok) {
          setSuggestions([]);
          setStatus("error");
          return;
        }
        const next = readSuggestions(await response.json());
        setSuggestions(next);
        setActive(0);
        setStatus(next.length === 0 ? "empty" : "ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setStatus("error");
        setOpen(true);
      }
    }
  }, [value]);

  function choose(suggestion: Suggestion) {
    picked.current = suggestion.label;
    onChange(suggestion.label);
    setOpen(false);
    setSuggestions([]);
    setStatus("idle");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || status !== "ready" || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeSuggestion) {
      event.preventDefault();
      choose(activeSuggestion);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <InputField
        label="Dirección en Posadas"
        name="address"
        autoComplete="off"
        placeholder="Calle y altura"
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (status === "ready" || status === "empty" || status === "error" || status === "loading") setOpen(true);
        }}
        errors={errors}
      />
      {open ? (
        <div className="absolute top-full right-0 left-0 z-30 mt-1 border border-line bg-paper shadow-lg">
          {status === "loading" ? <p className="px-4 py-3 text-sm text-muted">Buscando en Posadas…</p> : null}
          {status === "error" ? (
            <p className="px-4 py-3 text-sm text-muted" role="status">
              No pudimos buscar direcciones. Podés seguir escribiendo y calcular el envío.
            </p>
          ) : null}
          {status === "empty" ? (
            <p className="px-4 py-3 text-sm text-muted" role="status">
              No hay direcciones así en Posadas. Podés seguir escribiendo y calcular el envío.
            </p>
          ) : null}
          {status === "ready" ? (
            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    className="block w-full px-4 py-3 text-left text-sm hover:bg-surface aria-selected:bg-surface"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(suggestion)}
                  >
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {status === "ready" && needsHeight ? (
            <p className="border-t border-line px-4 py-3 text-sm text-muted">Agregá la altura, por ejemplo 1250.</p>
          ) : null}
          {status === "ready" ? (
            <p className="flex justify-end border-t border-line px-4 py-2">
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Powered by Google"
                width={120}
                height={14}
                className="h-3.5 w-auto"
              />
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function readSuggestions(payload: unknown): Suggestion[] {
  if (!payload || typeof payload !== "object" || !("suggestions" in payload) || !Array.isArray(payload.suggestions)) {
    return [];
  }

  const suggestions: Suggestion[] = [];
  for (const item of payload.suggestions) {
    if (!item || typeof item !== "object" || !("id" in item) || !("label" in item)) continue;
    if (typeof item.id !== "string" || typeof item.label !== "string") continue;
    if (item.id.length === 0 || item.id.length > 300 || item.label.length === 0 || item.label.length > 140) continue;
    suggestions.push({ id: item.id, label: item.label });
  }
  return suggestions;
}
