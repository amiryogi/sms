import React from "react";
import { Smartphone } from "lucide-react";
import { cn } from "../../lib/cn";

/*
 * Where the app will be: Google Play and the App Store, both "Coming soon".
 * Plain text badges, not links and not the stores' official artwork: the app is not
 * published yet (mobile/docs/BUILD_AND_DEPLOYMENT.md). When it is, swap these for real
 * store links and the official badges.
 */
const STORES = [
  { name: "Google Play", platform: "Android" },
  { name: "App Store", platform: "iPhone" },
];

const StoreBadges = ({ dark = false, className }) => (
  <ul aria-label="App stores" className={cn("flex flex-wrap items-center gap-3", className)}>
    {STORES.map((s) => (
      <li
        key={s.name}
        className={cn(
          "inline-flex items-center gap-3 rounded-xl px-4 py-2.5",
          dark ? "bg-white/5 text-white ring-1 ring-white/20" : "bg-slate-50 text-slate-900 ring-1 ring-slate-200",
        )}
      >
        <Smartphone size={22} className={dark ? "text-sky-300" : "text-brand-600"} aria-hidden="true" />
        <span className="leading-tight">
          <span className={cn("block text-[11px] font-medium tracking-wide uppercase", dark ? "text-blue-100/70" : "text-slate-500")}>
            Coming soon to
          </span>
          <span className="block text-base font-semibold">{s.name}</span>
        </span>
        <span className="sr-only">for {s.platform}</span>
      </li>
    ))}
  </ul>
);

export default StoreBadges;
