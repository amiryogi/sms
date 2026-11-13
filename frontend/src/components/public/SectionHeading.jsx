import React from "react";
import { cn } from "../../lib/cn";
import { Reveal } from "./Reveal";

/** Eyebrow + heading + intro, centred by default. */
const SectionHeading = ({ eyebrow, title, intro, align = "center", as = "h2", className }) => {
  const Heading = as;
  return (
    <Reveal className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">{eyebrow}</p>}
      <Heading className="mt-2 text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">{title}</Heading>
      {intro && <p className="mt-4 text-base leading-relaxed text-pretty text-slate-600 sm:text-lg">{intro}</p>}
    </Reveal>
  );
};

export default SectionHeading;
