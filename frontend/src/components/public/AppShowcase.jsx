import React, { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Tabs } from "../ui";
import { cn } from "../../lib/cn";
import DeviceFrame from "./DeviceFrame";
import StoreBadges from "./StoreBadges";
import { APP_PLATFORMS, APP_SHOTS } from "../../pages/public/content";

/*
 * The mobile app's screens on an iPhone or on Android, chosen with a switch, with the
 * "Coming soon" store badges. Meant for the dark ShotStage.
 *   wide: all five phones in a row on large screens (the home page);
 *   otherwise a row that scrolls sideways with snap points (narrow columns, phones).
 */
const AppShowcase = ({ wide = false, className }) => {
  const [platform, setPlatform] = useState("ios");
  const shots = APP_SHOTS[platform];
  const label = APP_PLATFORMS.find((p) => p.value === platform).label;

  return (
    <div className={className}>
      <div className="flex justify-center">
        <Tabs tabs={APP_PLATFORMS} value={platform} onChange={setPlatform} className="bg-white/10 ring-1 ring-white/15 [&_[aria-selected=false]]:text-blue-100/80 [&_[aria-selected=false]:hover]:text-white" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <Motion.ul
          key={platform}
          role="list"
          tabIndex={0}
          aria-label={`App screens on ${label}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pt-2 pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 [scrollbar-width:thin]",
            wide && "lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible",
          )}
        >
          {shots.map((shot, i) => (
            <li
              key={shot.src}
              className={cn(
                "w-[62%] shrink-0 snap-center sm:w-[38%]",
                !wide && "md:w-[42%] xl:w-[34%]",
                wide && "lg:w-auto",
                wide && i % 2 === 1 && "lg:translate-y-8",
              )}
            >
              <DeviceFrame shot={shot} />
              <p className="mt-4 text-center text-sm font-semibold text-white">{shot.title}</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-center text-xs leading-relaxed text-blue-100/70">{shot.caption}</p>
            </li>
          ))}
        </Motion.ul>
      </AnimatePresence>

      <StoreBadges dark className={cn("justify-center", wide ? "mt-14" : "mt-6")} />
    </div>
  );
};

export default AppShowcase;
