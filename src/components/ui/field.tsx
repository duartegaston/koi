import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full border border-line bg-background px-3 py-2 text-base outline-none transition " +
  "focus:border-primary aria-invalid:border-primary";

type FieldProps = {
  label: string;
  name: string;
  errors?: string[];
};

function FieldShell({ label, name, errors, children }: FieldProps & { children: React.ReactNode }) {
  const error = errors?.[0];
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block font-label text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-foreground">
          {error}
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
        className={cn(controlClass, "h-11", className)}
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

export function SelectField({
  label,
  name,
  errors,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors}>
      <select
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className={cn(controlClass, "h-11", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
