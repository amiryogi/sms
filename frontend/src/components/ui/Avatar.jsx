import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { resolveAssetUrl } from "../../utils/assets";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};

// Stable soft colour per name, so the same person always gets the same tint.
const TINTS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

/** Photo, or coloured initials when there is none or it fails to load. */
const Avatar = ({ src, name = "", size = "md", className }) => {
  const [failed, setFailed] = useState(false);
  const tint = TINTS[[...name].reduce((h, ch) => h + ch.charCodeAt(0), 0) % TINTS.length];
  const url = src ? resolveAssetUrl(src) : null;

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", SIZES[size] || SIZES.md, !url || failed ? tint : "bg-slate-100", className)}>
      {url && !failed ? (
        <img src={url} alt={name} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden={name ? undefined : "true"}>{initials(name)}</span>
      )}
    </span>
  );
};

export default Avatar;
