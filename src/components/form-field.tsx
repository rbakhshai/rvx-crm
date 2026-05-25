"use client";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  error?: string;
  className?: string;
};

function Label({ label, name, required, hint }: { label: string; name: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={name} className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

function Error({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-600">{error}</p>;
}

const inputStyle =
  "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function TextField({
  label,
  name,
  hint,
  required,
  error,
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
  className,
}: FieldProps & {
  type?: "text" | "email" | "tel" | "url" | "number" | "date";
  defaultValue?: string | number | null;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label label={label} name={name} required={required} hint={hint} />
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputStyle}
      />
      <Error error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  required,
  error,
  rows = 3,
  defaultValue,
  placeholder,
  className,
}: FieldProps & {
  rows?: number;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label label={label} name={name} required={required} hint={hint} />
      <textarea
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className={cn(inputStyle, "resize-y")}
      />
      <Error error={error} />
    </div>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  name,
  hint,
  required,
  error,
  options,
  defaultValue,
  placeholder = "—",
  className,
}: FieldProps & {
  options: SelectOption[];
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label label={label} name={name} required={required} hint={hint} />
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={cn(inputStyle, "appearance-none cursor-pointer")}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Error error={error} />
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  hint,
  defaultChecked,
  className,
}: FieldProps & {
  defaultChecked?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-2.5 cursor-pointer select-none", className)}>
      <input
        type="checkbox"
        id={name}
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary focus:ring-1"
      />
      <span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function MultiSelectField({
  label,
  name,
  hint,
  options,
  defaultValue,
  className,
}: FieldProps & {
  options: SelectOption[];
  defaultValue?: string[] | null;
}) {
  const selected = new Set(defaultValue ?? []);
  return (
    <div className={cn("space-y-1", className)}>
      <Label label={label} name={name} hint={hint ?? `${selected.size} selected`} />
      <div className="rounded-md border border-border bg-background p-2 max-h-44 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                name={name}
                value={o.value}
                defaultChecked={selected.has(o.value)}
                className="size-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary"
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
