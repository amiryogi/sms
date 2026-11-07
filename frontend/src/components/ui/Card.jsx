import React from "react";
import { cn } from "../../lib/cn";

/** White surface with a hairline border. Use padding="none" for edge-to-edge tables. */
export const Card = ({ as = "div", padding = "md", className, children, ...props }) => {
  const Tag = as;
  return (
  <Tag
    className={cn(
      "rounded-card border border-slate-200/80 bg-white shadow-card",
      padding === "md" && "p-5",
      padding === "lg" && "p-6",
      padding === "sm" && "p-4",
      className,
    )}
    {...props}
  >
    {children}
  </Tag>
  );
};

/** Title row inside a Card: title/description on the left, actions on the right. */
export const CardHeader = ({ title, description, icon: Icon, actions, className }) => (
  <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default Card;
