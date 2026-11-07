import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { controlClasses } from "./styles";

/**
 * Label + control + hint/error. `htmlFor` should match the control's id.
 */
export const Field = ({ label, htmlFor, hint, error, required, className, children }) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-red-600" role="alert">{error}</p>
    ) : hint ? (
      <p className="text-xs text-slate-500">{hint}</p>
    ) : null}
  </div>
);

export const TextInput = React.forwardRef(function TextInput(
  { invalid, icon: Icon, className, wrapperClassName, ...props },
  ref,
) {
  if (!Icon) return <input ref={ref} className={controlClasses(invalid, className)} aria-invalid={invalid || undefined} {...props} />;
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input ref={ref} className={controlClasses(invalid, cn("pl-9", className))} aria-invalid={invalid || undefined} {...props} />
    </div>
  );
});

export const SelectInput = React.forwardRef(function SelectInput({ invalid, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={controlClasses(invalid, cn("cursor-pointer appearance-none pr-9", className))}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
});

export const TextArea = React.forwardRef(function TextArea({ invalid, className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={controlClasses(invalid, cn("min-h-24 resize-y", className))}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Checkbox = React.forwardRef(function Checkbox({ label, description, className, id, ...props }, ref) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2.5 text-sm", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
        {...props}
      />
      <span>
        <span className="font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
});

/** On/off switch. Controlled: pass `checked` and `onChange(nextBoolean)`. */
export const Switch = ({ checked, onChange, label, description, disabled, id }) => (
  <div className="flex items-start justify-between gap-4">
    {(label || description) && (
      <div className="text-sm">
        {label && <label htmlFor={id} className="font-medium text-slate-700">{label}</label>}
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    )}
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-slate-300",
      )}
    >
      <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
    </button>
  </div>
);
