import React, { useId, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  Button as UIButton,
  Field,
  TextInput,
  SelectInput,
  TextArea,
} from "../ui";

/*
 * Form helpers used across the app. The props are unchanged from the original
 * vanilla-CSS versions (pages pass react-hook-form's `register` and a `name`);
 * only the rendering moved to the Tailwind kit in components/ui.
 */

const reg = (register, name) => (register && name ? register(name) : {});

export const Input = ({ label, error, icon, register, name, hint, className, ...props }) => (
  <Field label={label} htmlFor={name} error={error} hint={hint} required={props.required} className={cn("mb-4", className)}>
    <TextInput id={name} name={name} icon={icon} invalid={Boolean(error)} {...reg(register, name)} {...props} />
  </Field>
);

export const Select = ({ label, error, options = [], register, name, placeholder = "Select...", hint, className, ...props }) => (
  <Field label={label} htmlFor={name} error={error} hint={hint} required={props.required} className={cn("mb-4", className)}>
    <SelectInput id={name} name={name} invalid={Boolean(error)} {...reg(register, name)} {...props}>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </SelectInput>
  </Field>
);

export const Textarea = ({ label, error, register, name, hint, className, ...props }) => (
  <Field label={label} htmlFor={name} error={error} hint={hint} required={props.required} className={cn("mb-4", className)}>
    <TextArea id={name} name={name} invalid={Boolean(error)} {...reg(register, name)} {...props} />
  </Field>
);

/** Drop zone. onChange receives the FileList. */
export const FileUpload = ({ label, error, onChange, accept, multiple = false, files = [], hint }) => {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const list = Array.from(files || []);

  return (
    <Field label={label} htmlFor={id} error={error} className="mb-4">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer?.files?.length) onChange?.(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40",
          error && "border-red-300",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
          <UploadCloud size={18} aria-hidden="true" />
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-brand-700">Click to upload</span> or drag and drop
        </span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
        <input
          id={id}
          type="file"
          onChange={(e) => onChange?.(e.target.files)}
          accept={accept}
          multiple={multiple}
          className="sr-only"
        />
      </label>
      {list.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {list.map((file, i) => (
            <li key={`${file.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              <FileText size={13} aria-hidden="true" /> {file.name}
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
};

/** Legacy Button API: variant primary | secondary | outline | danger | success | warning. */
export const Button = ({ children, variant = "primary", loading = false, icon, size, className, ...props }) => (
  <UIButton variant={variant} loading={loading} icon={icon} size={size} className={className} {...props}>
    {children}
  </UIButton>
);

/** Puts its fields side by side from the `sm` breakpoint. */
export const FormRow = ({ children, className }) => (
  <div className={cn("grid gap-x-4 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]", className)}>{children}</div>
);
