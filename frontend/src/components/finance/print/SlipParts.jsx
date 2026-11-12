import React from "react";
import { resolveAssetUrl } from "../../../utils/assets";

/**
 * Small pieces shared by the printed fee slips and sheets. Black on white;
 * sizes are in pt so a slip measures the same on screen and on paper.
 */

/** School name and contact, with the logo only when the school has one. */
export const SchoolHeading = ({ school, title, compact = false }) => (
  <header className="flex items-start gap-2 border-b border-slate-400 pb-1.5">
    {school?.logoUrl && (
      <img src={resolveAssetUrl(school.logoUrl)} alt="" className={compact ? "size-9 shrink-0 object-contain" : "size-14 shrink-0 object-contain"} />
    )}
    <div className="min-w-0 flex-1 text-center">
      <p className={compact ? "text-[10.5pt] leading-tight font-bold" : "text-[15pt] leading-tight font-bold"}>{school?.name}</p>
      {school?.address && <p className={compact ? "text-[7pt] leading-snug" : "text-[9pt]"}>{school.address}</p>}
      {(school?.phone || school?.landlineNumber || school?.email) && (
        <p className={compact ? "text-[6.5pt] leading-snug text-slate-700" : "text-[8pt] text-slate-700"}>
          {[school?.landlineNumber, school?.phone, school?.email].filter(Boolean).join(" · ")}
        </p>
      )}
      {title && <p className={compact ? "mt-1 text-[8.5pt] font-bold tracking-wider uppercase" : "mt-1.5 text-[11pt] font-bold tracking-wider uppercase"}>{title}</p>}
    </div>
  </header>
);

/** A label / value pair in the slip's student block. */
export const Pair = ({ label, children, className = "" }) => (
  <div className={className}>
    <span className="text-slate-600">{label}: </span>
    <span className="font-semibold">{children}</span>
  </div>
);

/** A signature line at the foot of a slip or sheet. */
export const SignatureLine = ({ label, className = "" }) => (
  <p className={`border-t border-slate-500 pt-0.5 text-center ${className}`}>{label}</p>
);
