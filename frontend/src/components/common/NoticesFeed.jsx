import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, ArrowRight, RotateCw } from "lucide-react";
import { noticeService } from "../../api/noticeService";
import { Badge, Button, EmptyState, Skeleton } from "../ui";
import { cn } from "../../lib/cn";
import { formatDate, formatRelative, fullName } from "../../utils/format";

/**
 * Read-only feed of published notices for the signed-in user. The backend
 * decides which notices a user may see (role and class targeting).
 *
 * Props: limit (5), showViewAll (true), viewAllPath, compact (false).
 */

// Only high and urgent are states worth colour; normal and low stay quiet.
const PRIORITY = {
  urgent: { dot: "bg-risk", tone: "danger", label: "Urgent" },
  high: { dot: "bg-warn", tone: "warning", label: "High" },
  normal: { dot: "bg-slate-300", tone: "neutral", label: "Normal" },
  low: { dot: "bg-slate-300", tone: "neutral", label: "Low" },
};

const NoticesFeed = ({ limit = 5, showViewAll = true, viewAllPath = null, compact = false }) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await noticeService.getNotices({ limit, status: "PUBLISHED" });
      setNotices(response.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        compact
        icon={Bell}
        title="Couldn't load notices"
        description="Check your connection and try again."
        action={<Button size="sm" variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>}
      />
    );
  }

  if (notices.length === 0) {
    return <EmptyState compact icon={Bell} title="No notices right now" description="Announcements from the school appear here as soon as they are published." />;
  }

  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {notices.map((notice) => {
          const p = PRIORITY[notice.priority] || PRIORITY.normal;
          const open = expandedId === notice.id;
          const when = notice.publishedAt || notice.createdAt;
          return (
            <li key={notice.id}>
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : notice.id)}
                aria-expanded={open}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-lg text-left transition-colors hover:bg-slate-50",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  compact ? "px-2 py-2.5" : "px-3 py-3",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", p.dot)} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{notice.title}</span>
                  <span className="block text-xs text-slate-500 first-letter:uppercase" title={formatDate(when)}>{formatRelative(when)}</span>
                </span>
                {notice.priority !== "normal" && notice.priority !== "low" && <Badge tone={p.tone}>{p.label}</Badge>}
                <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
              </button>
              {open && (
                <div className={cn("pb-3", compact ? "pr-2 pl-7" : "pr-3 pl-8")}>
                  <p className="max-w-[68ch] text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{notice.content}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Posted by {fullName(notice.createdBy)} on {formatDate(when)}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {showViewAll && viewAllPath && (
        <Link to={viewAllPath} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
          View all notices <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
};

export default NoticesFeed;
