import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Calendar,
  Users,
  BookOpen,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { noticeService } from "../../api/noticeService";

/**
 * NoticesView Page
 *
 * Full-page read-only notices view for Students, Parents, and Teachers.
 * Shows all published notices the user is authorized to see.
 * No create/edit/delete capabilities - those are admin-only.
 */
const NoticesView = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    priority: "",
    search: "",
  });

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: "PUBLISHED", // Only published notices
      };
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const response = await noticeService.getNotices(params);
      setNotices(response.data || []);
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
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

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    setExpandedId(null);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#f59e0b";
      case "normal":
        return "#3b82f6";
      case "low":
        return "#6b7280";
      default:
        return "#3b82f6";
    }
  };

  const getPriorityBgColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#fef2f2";
      case "high":
        return "#fffbeb";
      case "normal":
        return "#eff6ff";
      case "low":
        return "#f9fafb";
      default:
        return "#eff6ff";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="notices-view-page">
      <div className="page-header">
        <div>
          <h1>
            <Bell size={28} /> Notices
          </h1>
          <p className="text-muted">School announcements and updates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <Filter size={18} />
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search notices..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div className="notices-container">
        {loading ? (
          <div className="card loading-card">
            <div className="loading-spinner"></div>
            <p>Loading notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="card empty-card">
            <Bell size={48} className="text-muted" />
            <h3>No Notices</h3>
            <p className="text-muted">
              There are no notices to display at this time.
            </p>
          </div>
        ) : (
          <div className="notices-list">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`notice-card ${
                  expandedId === notice.id ? "expanded" : ""
                }`}
                style={{ borderLeftColor: getPriorityColor(notice.priority) }}
              >
                <div
                  className="notice-header"
                  onClick={() => toggleExpand(notice.id)}
                >
                  <div className="notice-main">
                    <div className="notice-title-row">
                      <h3>{notice.title}</h3>
                      {notice.priority !== "normal" && (
                        <span
                          className="priority-badge"
                          style={{
                            backgroundColor: getPriorityBgColor(
                              notice.priority
                            ),
                            color: getPriorityColor(notice.priority),
                          }}
                        >
                          {notice.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="notice-meta">
                      <span>
                        <Calendar size={14} />{" "}
                        {formatDate(notice.publishedAt || notice.createdAt)}
                      </span>
                      <span>•</span>
                      <span>
                        By {notice.createdBy?.firstName}{" "}
                        {notice.createdBy?.lastName}
                      </span>
                    </div>
                  </div>
                  <button className="expand-btn">
                    {expandedId === notice.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                </div>

                {expandedId === notice.id && (
                  <div className="notice-body">
                    <div className="notice-content">
                      <p>{notice.content}</p>
                    </div>

                    <div className="notice-details">
                      {notice.publishedAt && (
                        <div className="detail-item">
                          <strong>Published:</strong>
                          <span>{formatDateTime(notice.publishedAt)}</span>
                        </div>
                      )}
                      {(notice.publishFrom || notice.publishTo) && (
                        <div className="detail-item">
                          <strong>Visible:</strong>
                          <span>
                            {notice.publishFrom
                              ? formatDate(notice.publishFrom)
                              : "Start"}
                            {" — "}
                            {notice.publishTo
                              ? formatDate(notice.publishTo)
                              : "No end date"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <style>{`
        .notices-view-page {
          max-width: 900px;
        }
        .filter-card {
          margin-bottom: 1rem;
        }
        .filter-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-group select,
        .filter-group input {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        .search-group {
          flex: 1;
          min-width: 200px;
        }
        .search-group input {
          width: 100%;
        }
        .loading-card,
        .empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .empty-card h3 {
          margin: 1rem 0 0.5rem;
          color: #1e293b;
        }
        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .notice-card {
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #3b82f6;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .notice-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .notice-card.expanded {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .notice-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1.25rem;
          cursor: pointer;
        }
        .notice-header:hover {
          background: #f8fafc;
        }
        .notice-main {
          flex: 1;
          min-width: 0;
        }
        .notice-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .notice-title-row h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .priority-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .notice-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
        }
        .notice-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .expand-btn {
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          color: #64748b;
          border-radius: 6px;
        }
        .expand-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .notice-body {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid #e2e8f0;
        }
        .notice-content {
          padding: 1rem 0;
        }
        .notice-content p {
          margin: 0;
          line-height: 1.7;
          color: #334155;
          white-space: pre-wrap;
        }
        .notice-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding-top: 1rem;
          border-top: 1px dashed #e2e8f0;
          font-size: 0.85rem;
        }
        .detail-item {
          display: flex;
          gap: 0.5rem;
        }
        .detail-item strong {
          color: #64748b;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
        }
        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination button:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default NoticesView;
