import React from "react";
import { cn } from "../../lib/cn";

/**
 * Page title block: title, optional description, and actions on the right.
 * Breadcrumbs live in the top bar, so they are not repeated here.
 *
 * An `icon` prop passed by a caller is ignored on purpose (it is simply not
 * read). Every page used to carry a decorative tile beside its title, which
 * added no information — the title already says "Students" — and was the most
 * templated element in the old design (see frontend/DESIGN.md, "Icons and
 * imagery"). Ignoring the prop rather than making it an error keeps ~40 call
 * sites working; drop it from a page whenever you next touch that page.
 */
const PageHeader = ({ title, description, actions, className, children }) => (
  <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 max-w-[68ch] text-sm text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    {children}
  </div>
);

export default PageHeader;
