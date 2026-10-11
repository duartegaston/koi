import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition " +
  "focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-800";

type FieldProps = {
  label: string;
  name: string;
  errors?: string[];
};

function FieldShell({ label, name, errors, children }: FieldProps & { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function InputField({
  label,
  name,
  errors,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors}>
      <input
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className={cn(controlClass, className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  errors,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors}>
      <textarea
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className={cn(controlClass, "min-h-32", className)}
        {...props}
      />
    </FieldShell>
  );
}
