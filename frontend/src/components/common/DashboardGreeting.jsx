import React from "react";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/format";
import { cn } from "../../lib/cn";

/** "Good morning" / "Good afternoon" / "Good evening" by the browser's clock. */
const greeting = (date = new Date()) => {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/*
 * The head of every role's dashboard: today's date, "Good morning, Sita", one
 * line about what is on the page, and an optional aside on the right (the
 * academic year, a class-teacher badge, a profile link).
 *
 * The admin, teacher, student and parent dashboards each carried their own copy
 * of this block and of `greeting()`; they had drifted (two spacings, one with an
 * avatar). It is the page's title, so it renders the page's one h1.
 *
 *   subtitle  string or node under the heading
 *   aside     node shown on the right (wraps below on a phone)
 *   leading   node before the text, e.g. an <Avatar>
 */
const DashboardGreeting = ({ subtitle, aside, leading, className }) => {
  const { user } = useAuth();
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {greeting()}, {user?.firstName}
          </h1>
          {subtitle && <div className="mt-1 max-w-[68ch] text-sm text-slate-500">{subtitle}</div>}
        </div>
      </div>
      {aside}
    </div>
  );
};

export default DashboardGreeting;
