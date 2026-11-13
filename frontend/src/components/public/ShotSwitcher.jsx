import React, { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { cn } from "../../lib/cn";
import BrowserFrame from "./BrowserFrame";
import ShotStage from "./ShotStage";

/** One large screenshot on the blue stage, with thumbnails to switch between related screens. */
const ShotSwitcher = ({ shots, label }) => {
  const [index, setIndex] = useState(0);
  const current = shots[index];
  if (!current) return null;

  return (
    <ShotStage>
      <AnimatePresence mode="wait" initial={false}>
        <Motion.div
          key={current.name}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.3 }}
        >
          <BrowserFrame shot={current} dark />
        </Motion.div>
      </AnimatePresence>
      <p className="mt-4 min-h-10 text-sm text-blue-100/80">
        <span className="font-semibold text-white">{current.title}.</span> {current.caption}
      </p>
      {shots.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label={`${label} screenshots`}>
          {shots.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Show ${s.title}`}
              className={cn(
                "w-20 cursor-pointer overflow-hidden rounded-lg ring-2 transition-all sm:w-28",
                i === index ? "ring-sky-400 shadow-lg shadow-sky-500/30" : "opacity-75 ring-white/15 hover:opacity-100 hover:ring-white/40",
              )}
            >
              <img src={s.src} alt="" width={s.width} height={s.height} loading="lazy" className="block h-auto w-full" />
            </button>
          ))}
        </div>
      )}
    </ShotStage>
  );
};

export default ShotSwitcher;
