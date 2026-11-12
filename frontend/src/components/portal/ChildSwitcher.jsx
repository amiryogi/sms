import React from "react";
import { Users } from "lucide-react";
import { Avatar, Card, EmptyState, Skeleton } from "../ui";
import { cn } from "../../lib/cn";
import { fullName } from "../../utils/format";

const classOf = (c) => (c.currentEnrollment ? `${c.currentEnrollment.class.name} ${c.currentEnrollment.section.name}` : "Not enrolled this year");

/**
 * Which child a parent is looking at. One child: a small header. Several: a
 * segmented control (radio group) of children. Pass the result of useChildren().
 * Renders the empty and error states too, so pages can return early on `!child`.
 */
const ChildSwitcher = ({ kids, child, select, loading, error }) => {
  if (loading) return <Skeleton className="h-16 rounded-card" />;
  if (error) return <Card><EmptyState icon={Users} title="Couldn't load your children" description={error} /></Card>;
  if (!kids?.length) {
    return <Card><EmptyState icon={Users} title="No children linked" description="Ask the school office to link your child to your account." /></Card>;
  }

  if (kids.length === 1) {
    return (
      <div className="flex items-center gap-3 print:hidden">
        <Avatar src={child.user?.avatarUrl} name={fullName(child)} size="md" />
        <div>
          <p className="font-semibold text-slate-900">{fullName(child)}</p>
          <p className="text-sm text-slate-500">
            {classOf(child)}
            {child.admissionNumber ? ` · ${child.admissionNumber}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Choose a child" className="flex flex-wrap gap-2 print:hidden">
      {kids.map((c) => {
        const on = c.id === child?.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => select(c.id)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-600",
              on ? "border-brand-300 bg-brand-50 ring-1 ring-brand-300" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
          >
            <Avatar src={c.user?.avatarUrl} name={fullName(c)} size="sm" />
            <span>
              <span className={cn("block text-sm font-semibold", on ? "text-brand-800" : "text-slate-900")}>{fullName(c)}</span>
              <span className="block text-xs text-slate-500">{classOf(c)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ChildSwitcher;
