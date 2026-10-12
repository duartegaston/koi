"use client";

import { useActionState } from "react";
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
      <InputField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={errors?.password}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando" : "Entrar"}
      </Button>
    </form>
  );
}
