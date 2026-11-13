import React from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "../../lib/cn";

/** The Vidyalaya SMS wordmark. `inverted` for dark backgrounds. */
const ProductLogo = ({ inverted = false, className }) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ring-1 ring-brand-700/20">
      <GraduationCap size={20} aria-hidden="true" />
    </span>
    <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
      Vidyalaya<span className={inverted ? "text-brand-300" : "text-brand-600"}> SMS</span>
    </span>
  </span>
);

export default ProductLogo;
