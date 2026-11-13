import React from "react";
import { cn } from "../../lib/cn";

/*
 * Dark blue gradient backdrop for screenshots. The app's screens are white, so on the
 * site's light sections they blur into the page; on this stage they stand out.
 * Fixed blue (not the school's brand colour): this is the product site's own look.
 * `compact` drops the glow and grid for small tiles (the tour grid).
 */
const ShotStage = ({ as = "div", compact = false, className, children }) => {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "relative block overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 ring-1 ring-blue-950/40",
        compact ? "rounded-xl p-2.5 sm:p-3" : "rounded-2xl p-3 shadow-xl shadow-blue-950/25 sm:p-6",
        className,
      )}
    >
      {!compact && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-sky-400/25 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-blue-500/30 blur-3xl" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:32px_32px]"
          />
        </>
      )}
      <span className="relative block">{children}</span>
    </Tag>
  );
};

export default ShotStage;
