import React from "react";
import { cn } from "../../lib/cn";

/**
 * Page title block: title, optional description, and actions on the right.
 * Breadcrumbs live in the top bar, so they are not repeated here.
 */
const PageHeader = ({ title, description, actions, icon: Icon, className, children }) => (
  <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card ring-1 ring-slate-200 sm:flex">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    {children}
  </div>
);

export default PageHeader;
