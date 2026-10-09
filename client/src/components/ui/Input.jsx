import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

function Field({ label, error, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      {children}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const errorClass = "border-danger";

export function Input({ label, error, className, ...props }) {
  return (
    <Field label={label} error={error}>
      <input
        className={cn("input-base rounded-full", error && errorClass, className)}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, error, rows = 4, className, ...props }) {
  return (
    <Field label={label} error={error}>
      <textarea
        rows={rows}
        className={cn("input-base resize-none rounded-2xl", error && errorClass, className)}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, className, children, ...props }) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <select
          className={cn("input-base appearance-none rounded-full pr-10", error && errorClass, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
    </Field>
  );
}
