import React from "react";
import { cn } from "../../lib/cn";

/**
 * The one page container: one max width, one gutter, one vertical rhythm.
 *
 * Before this existed, pages chose their own: seven different max widths across
 * 59 pages (`max-w-7xl` ×18, `6xl` ×15, `5xl` ×9, `4xl` ×3, `3xl` ×2) plus 16
 * pages with no constraint at all, and `space-y-6` and `space-y-4` split almost
 * evenly. Four near-identical CRUD pages — Sections, Classes, Subjects,
 * Students — each picked a different width, so their tables did not line up
 * with one another.
 *
 * `width="prose"` is the one sanctioned exception, for a page that is mostly
 * reading or a single narrow form (Change password, Calendar settings), where a
 * full-width measure would be unreadable.
 *
 * The outer padding still comes from DashboardLayout's `page-content`; this owns
 * only the measure and the rhythm inside it.
 */
const WIDTHS = {
  default: "max-w-[88rem]",
  prose: "max-w-3xl",
};

const PageShell = ({ width = "default", className, children, ...props }) => (
  <div className={cn("mx-auto space-y-6", WIDTHS[width] || WIDTHS.default, className)} {...props}>
    {children}
  </div>
);

export default PageShell;
