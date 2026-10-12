"use client";

import { useActionState, useState } from "react";
import { loginAdmin, type LoginState } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

const initialState: LoginState = { status: "idle" };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initialState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <p role="alert" className="border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
      <InputField label="Usuario" name="username" autoComplete="username" required errors={errors?.username} />
      <PasswordField errors={errors?.password} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando" : "Entrar"}
      </Button>
    </form>
  );
}

function PasswordField({ errors }: { errors?: string[] }) {
  const [visible, setVisible] = useState(false);
  const error = errors?.[0];

  return (
    <div className="space-y-1.5">
      <label htmlFor="password" className="block font-label text-sm font-medium">
        Contraseña
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error" : undefined}
          className="h-11 w-full border border-line bg-background px-3 pr-24 text-base outline-none transition focus:border-primary aria-invalid:border-primary"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 font-label text-sm"
          aria-pressed={visible}
          aria-controls="password"
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {error ? (
        <p id="password-error" className="text-sm text-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
