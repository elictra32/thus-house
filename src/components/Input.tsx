import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, error, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-[10px] border bg-bg px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand",
          error ? "border-danger" : "border-edge",
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
});

export default Input;

export function Textarea({
  label,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className={className}>
      {label && <label htmlFor={rest.id ?? rest.name} className="label">{label}</label>}
      <textarea
        id={rest.id ?? rest.name}
        className="w-full rounded-[10px] border border-edge bg-bg px-3.5 py-3 text-sm text-ink outline-none focus:border-brand"
        {...rest}
      />
    </div>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className={className}>
      {label && <label htmlFor={rest.id ?? rest.name} className="label">{label}</label>}
      <select
        id={rest.id ?? rest.name}
        className="w-full rounded-[10px] border border-edge bg-bg px-3.5 py-3 text-sm text-ink outline-none focus:border-brand"
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
