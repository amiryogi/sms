import React from "react";
import { SchoolHeading, Pair } from "../finance/print/SlipParts";

/**
 * One printed login slip (a quarter of A4, inside SlipSheet): who it is for,
 * where to sign in, the username and the temporary password. The password is
 * only on this paper and on screen until the page is left; it is never stored.
 */
const LoginSlip = ({ credential: c, school, signInAt }) => (
  <article className="login-slip text-[8.5pt] leading-snug text-slate-900" data-username={c.username}>
    <SchoolHeading school={school} title="Your sign-in details" compact />

    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded border border-slate-300 p-1.5">
      <Pair label={c.role === "PARENT" ? "Parent" : "Student"} className="col-span-2">{c.name}</Pair>
      {c.role === "PARENT" && c.children?.length > 0 && <Pair label="Child" className="col-span-2">{c.children.join(", ")}</Pair>}
      {c.class && (
        <Pair label="Class">
          {c.class} {c.section}
        </Pair>
      )}
      {c.rollNumber != null && <Pair label="Roll">{c.rollNumber}</Pair>}
    </div>

    <dl className="mt-3 space-y-2">
      <div>
        <dt className="text-[7pt] text-slate-600 uppercase">Sign in at</dt>
        <dd className="font-medium break-all">{signInAt}</dd>
      </div>
      <div>
        <dt className="text-[7pt] text-slate-600 uppercase">Username</dt>
        <dd className="rounded border border-slate-400 px-2 py-1 font-mono text-[12pt] font-bold tracking-wide">{c.username}</dd>
      </div>
      <div>
        <dt className="text-[7pt] text-slate-600 uppercase">Temporary password</dt>
        <dd className="login-slip-password rounded border border-slate-400 px-2 py-1 font-mono text-[12pt] font-bold tracking-wider">{c.temporaryPassword}</dd>
      </div>
    </dl>

    <p className="mt-3 text-[7.5pt]">
      The first time you sign in you will choose your own password. Keep it private. Lost it? Ask the school office to reset it.
    </p>
  </article>
);

export default LoginSlip;
