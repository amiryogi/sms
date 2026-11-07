import React from "react";
import { cn } from "../../lib/cn";

/** Circular spinner; inherits the text colour. */
const Spinner = ({ size = 16, className, label }) => (
  <svg
    className={cn("animate-spin", className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    role={label ? "status" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** Centered spinner with optional text, for whole sections or pages. */
export const LoadingBlock = ({ text = "Loading…", className }) => (
  <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-sm text-slate-500", className)}>
    <Spinner size={24} className="text-brand-600" />
    {text && <p>{text}</p>}
  </div>
);

export default Spinner;
