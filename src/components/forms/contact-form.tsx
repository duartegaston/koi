"use client";

import { useActionState } from "react";
import { submitContact, type ContactFormState } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";

const initialState: ContactFormState = { status: "idle" };

function safeWhatsAppUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "wa.me") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, initialState);

  if (state.status === "success") {
    const whatsAppUrl = safeWhatsAppUrl(state.whatsAppUrl);
    return (
      <div role="status" className="space-y-4">
        <p className="rounded-md bg-emerald-50 p-4 text-emerald-800">{state.message}</p>
        {whatsAppUrl ? (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Enviar pedido por WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <InputField label="Nombre" name="name" autoComplete="name" required defaultValue={values?.name} errors={errors?.name} />
      <InputField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values?.email}
        errors={errors?.email}
      />
      <InputField
        label="WhatsApp (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+5491112345678"
        defaultValue={values?.phone}
        errors={errors?.phone}
      />
      <TextareaField label="Mensaje" name="message" required defaultValue={values?.message} errors={errors?.message} />

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
