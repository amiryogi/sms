import React from "react";
import { cn } from "../../lib/cn";

/**
 * A screenshot inside a light browser window, with the page's path in the address bar.
 * `dark` for the blue ShotStage: a deeper shadow and a light rim instead of a grey one.
 */
const BrowserFrame = ({ shot, priority = false, dark = false, className, imgClassName }) => (
  <figure
    className={cn(
      "overflow-hidden rounded-xl bg-white",
      dark ? "shadow-2xl shadow-black/50 ring-1 ring-white/15" : "shadow-pop ring-1 ring-slate-900/10",
      className,
    )}
  >
    <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50 px-3.5 py-2.5" aria-hidden="true">
      <span className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
      </span>
      {shot.path && (
        <span className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-center text-[11px] text-slate-400 ring-1 ring-slate-200">
          {shot.path}
        </span>
      )}
    </div>
    <img
      src={shot.src}
      width={shot.width}
      height={shot.height}
      alt={shot.title}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("block h-auto w-full", imgClassName)}
    />
  </figure>
);

export default BrowserFrame;
