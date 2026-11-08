import React, { useState, useEffect, useCallback } from "react";
import { Bell, Search, ChevronDown, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { noticeService } from "../../api/noticeService";
import { PageHeader, Card, Badge, Button, TextInput, SelectInput, EmptyState, Skeleton, toast } from "../../components/ui";
import { cn } from "../../lib/cn";
import { formatDate, formatDateTime, formatRelative } from "../../utils/format";

/**
 * Read-only notices for every non-admin role. The backend returns only the
 * published notices this user may see (role and class targeting).
 */

const PRIORITY = {
  urgent: { tone: "danger", label: "Urgent", stripe: "border-l-red-500" },
  high: { tone: "warning", label: "High", stripe: "border-l-amber-500" },
  normal: { tone: "info", label: "Normal", stripe: "border-l-sky-500" },
  low: { tone: "neutral", label: "Low", stripe: "border-l-slate-300" },
};

const NoticesView = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({ priority: "", search: "" });

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit, status: "PUBLISHED" };
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;
      const response = await noticeService.getNotices(params);
      setNotices(response.data || []);
      if (response.pagination) {
        setPagination((prev) => ({ ...prev, total: response.pagination.total, totalPages: response.pagination.totalPages }));
      }
    } catch {
      toast.error("Could not load notices");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, page }));
    setExpandedId(null);
  };

  const filtered = Boolean(filters.search || filters.priority);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader icon={Megaphone} title="Notices" description="Announcements and updates from the school." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <TextInput
          icon={Search}
          wrapperClassName="flex-1"
          placeholder="Search notices…"
          aria-label="Search notices"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />
        <div className="sm:w-44">
          <SelectInput aria-label="Priority" value={filters.priority} onChange={(e) => handleFilterChange("priority", e.target.value)}>
            <option value="">Any priority</option>
            {Object.entries(PRIORITY).map(([value, p]) => (
              <option key={value} value={value}>{p.label}</option>
            ))}
          </SelectInput>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={filtered ? "No notices match" : "No notices yet"}
            description={filtered ? "Try a different search or priority." : "Announcements from the school will appear here."}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {notices.map((notice) => {
            const p = PRIORITY[notice.priority] || PRIORITY.normal;
            const open = expandedId === notice.id;
            const when = notice.publishedAt || notice.createdAt;
            return (
              <li key={notice.id} className={cn("overflow-hidden rounded-card border border-l-4 border-slate-200/80 bg-white shadow-card", p.stripe)}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : notice.id)}
                  aria-expanded={open}
                  className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left hover:bg-slate-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{notice.title}</h2>
                      {notice.priority !== "normal" && <Badge tone={p.tone}>{p.label}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      <span className="inline-block first-letter:uppercase" title={formatDateTime(when)}>{formatRelative(when)}</span>
                      {" · "}
                      {notice.createdBy?.firstName} {notice.createdBy?.lastName}
                    </p>
                    {!open && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{notice.content}</p>}
                  </div>
                  <ChevronDown size={18} className={cn("mt-1 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{notice.content}</p>
                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      {notice.publishedAt && (
                        <div><dt className="inline">Published </dt><dd className="inline font-medium text-slate-700">{formatDateTime(notice.publishedAt)}</dd></div>
                      )}
                      {(notice.publishFrom || notice.publishTo) && (
                        <div>
                          <dt className="inline">Visible </dt>
                          <dd className="inline font-medium text-slate-700">
                            {notice.publishFrom ? formatDate(notice.publishFrom) : "now"} – {notice.publishTo ? formatDate(notice.publishTo) : "no end date"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} notices
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" iconRight={ChevronRight} disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticesView;
