import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full border border-line bg-background px-3 py-2 text-base outline-none transition " +
  "focus:border-primary aria-invalid:border-primary";

type FieldProps = {
  label: string;
  name: string;
  id?: string;
  errors?: string[];
};

function FieldShell({ label, name, id = name, errors, children }: FieldProps & { children: React.ReactNode }) {
  const error = errors?.[0];
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-label text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InputField({
  label,
  name,
  id = name,
  errors,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} name={name} id={id} errors={errors}>
      <input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        className={cn(controlClass, "h-11", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  id = name,
  errors,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} name={name} id={id} errors={errors}>
      <textarea
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        className={cn(controlClass, "min-h-32", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  id = name,
  errors,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} name={name} id={id} errors={errors}>
      <select
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        className={cn(controlClass, "h-11", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
