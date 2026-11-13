import React from "react";
import { cn } from "../../lib/cn";

/** A phone-sized screenshot in a simple device outline. */
const PhoneFrame = ({ shot, className }) => (
  <figure className={cn("rounded-[2rem] bg-slate-900 p-2 shadow-pop ring-1 ring-slate-900/20", className)}>
    <div className="relative overflow-hidden rounded-[1.55rem] bg-white">
      <span className="absolute top-1.5 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" aria-hidden="true" />
      <img
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.title}
        loading="eager"
        decoding="async"
        className="block aspect-[390/700] h-auto w-full object-cover object-top"
      />
    </div>
  </figure>
);

export default PhoneFrame;
