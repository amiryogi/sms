import React from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "../../lib/cn";

/*
 * A mobile-app screenshot in an iPhone or Android outline.
 *
 * The screenshots are captured with the phone's safe areas emulated (e2e/mobile-shots), so the
 * app leaves the status-bar space at the top and the home-indicator space at the bottom, as on
 * a real phone. This frame draws the status bar, camera and home indicator into those spaces.
 * Sizes are in container units (cqw), so the outline looks the same at any width.
 * `shot.darkTop`: the screen starts with a dark colour band, so the status bar is white.
 */
const SPEC = {
  ios: { bezel: "p-[3.2cqw] rounded-[15cqw]", screen: "rounded-[12.4cqw]", bar: "12.05cqw", time: "9:41", text: "text-[3.9cqw]" },
  android: { bezel: "p-[2.4cqw] rounded-[10cqw]", screen: "rounded-[8cqw]", bar: "6.8cqw", time: "12:30", text: "text-[3.3cqw]" },
};

const StatusIcons = ({ platform }) => (
  <span className="flex items-center gap-[1.2cqw]">
    {platform === "ios" ? (
      <>
        <Signal className="size-[4.2cqw]" strokeWidth={2.6} />
        <Wifi className="size-[4.2cqw]" strokeWidth={2.6} />
        <BatteryFull className="size-[6cqw]" strokeWidth={2} />
      </>
    ) : (
      <>
        <Wifi className="size-[3.6cqw]" strokeWidth={2.6} />
        <Signal className="size-[3.6cqw]" strokeWidth={2.6} />
        <BatteryFull className="size-[4.6cqw]" strokeWidth={2} />
      </>
    )}
  </span>
);

const DeviceFrame = ({ shot, priority = false, className }) => {
  const platform = shot.platform === "android" ? "android" : "ios";
  const spec = SPEC[platform];
  const tone = shot.darkTop ? "text-white" : "text-slate-900";

  return (
    <div className={cn("@container", className)}>
      <figure className={cn("relative bg-slate-950 shadow-2xl shadow-black/40 ring-1 ring-white/10", spec.bezel)}>
        {/* side buttons */}
        <span aria-hidden="true" className={cn("absolute top-[22%] h-[7%] w-[1.1cqw] rounded-full bg-slate-800", platform === "ios" ? "-left-[0.9cqw]" : "-right-[0.9cqw]")} />
        <span aria-hidden="true" className={cn("absolute top-[32%] h-[11%] w-[1.1cqw] rounded-full bg-slate-800", platform === "ios" ? "-left-[0.9cqw]" : "-right-[0.9cqw]")} />

        <div className={cn("@container relative overflow-hidden bg-white", spec.screen)}>
          <img
            src={shot.src}
            width={shot.width}
            height={shot.height}
            alt={shot.alt || shot.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="block h-auto w-full"
          />

          {/* status bar, in the space the app left for it */}
          <div
            aria-hidden="true"
            style={{ height: spec.bar }}
            className={cn("absolute inset-x-0 top-0 flex items-center justify-between font-semibold tabular-nums", spec.text, tone, platform === "ios" ? "px-[8cqw] pt-[1cqw]" : "px-[5.5cqw]")}
          >
            <span className={platform === "ios" ? "w-[22cqw] text-center" : ""}>{spec.time}</span>
            <StatusIcons platform={platform} />
          </div>

          {/* camera */}
          {platform === "ios" ? (
            <span aria-hidden="true" className="absolute top-[2.8cqw] left-1/2 h-[9.4cqw] w-[31cqw] -translate-x-1/2 rounded-full bg-black" />
          ) : (
            <span aria-hidden="true" className="absolute top-[1.6cqw] left-1/2 size-[3.6cqw] -translate-x-1/2 rounded-full bg-black ring-[0.6cqw] ring-slate-900/30" />
          )}

          {/* home indicator / gesture bar */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80",
              platform === "ios" ? "bottom-[2.2cqw] h-[1.3cqw] w-[34cqw]" : "bottom-[1.4cqw] h-[1cqw] w-[26cqw]",
            )}
          />
        </div>
      </figure>
    </div>
  );
};

export default DeviceFrame;
