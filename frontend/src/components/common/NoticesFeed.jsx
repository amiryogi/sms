import React, { useState, useEffect } from "react";
import {
  Bell,
  AlertCircle,
  ChevronRight,
  Calendar,
  Users,
  BookOpen,
} from "lucide-react";
import { noticeService } from "../../api/noticeService";

/**
 * NoticesFeed Component
 *
 * A read-only feed of notices for Students, Parents, and Teachers.
 * The backend automatically filters notices based on user role and targeting.
 *
 * Props:
 *   - limit: Number of notices to show (default: 5)
 *   - showViewAll: Show "View All" link (default: true)
 *   - viewAllPath: Path for "View All" link
 *   - compact: Compact mode for dashboard widgets (default: false)
 */
const NoticesFeed = ({
  limit = 5,
  showViewAll = true,
  viewAllPath = null,
  compact = false,
}) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchNotices();
  }, [limit]);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await noticeService.getNotices({
        limit,
        status: "PUBLISHED", // Only show published notices
      });
      setNotices(response.data || []);
    } catch (err) {
      console.error("Error fetching notices:", err);
      setError("Failed to load notices");
    } finally {
      setLoading(false);
    }
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

  const getTargetIcon = (targetType) => {
    switch (targetType) {
      case "GLOBAL":
        return <Users size={14} />;
      case "ROLE_SPECIFIC":
        return <Users size={14} />;
      case "CLASS_SPECIFIC":
        return <BookOpen size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="notices-feed notices-loading">
        <div className="loading-spinner"></div>
        <p>Loading notices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notices-feed notices-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchNotices} className="btn btn-sm btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className="notices-feed notices-empty">
        <Bell size={32} className="text-muted" />
        <p className="text-muted">No notices at this time</p>
      </div>
    );
  }

  return (
    <div className={`notices-feed ${compact ? "compact" : ""}`}>
      <div className="notices-list">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`notice-item ${
              notice.priority === "urgent" ? "urgent" : ""
            } ${expandedId === notice.id ? "expanded" : ""}`}
            onClick={() => toggleExpand(notice.id)}
          >
            <div className="notice-header">
              <div
                className="notice-priority-indicator"
                style={{ backgroundColor: getPriorityColor(notice.priority) }}
              />
              <div className="notice-title-row">
                <h4 className="notice-title">{notice.title}</h4>
                <span className="notice-meta">
                  <Calendar size={12} />
                  {formatDate(notice.publishedAt || notice.createdAt)}
                </span>
              </div>
              <ChevronRight
                size={18}
                className={`expand-icon ${
                  expandedId === notice.id ? "rotated" : ""
                }`}
              />
            </div>

            {expandedId === notice.id && (
              <div className="notice-content">
                <p>{notice.content}</p>
                <div className="notice-footer">
                  <span className="notice-author">
                    Posted by {notice.createdBy?.firstName}{" "}
                    {notice.createdBy?.lastName}
                  </span>
                  {notice.priority !== "normal" && (
                    <span
                      className="notice-priority-badge"
                      style={{
                        backgroundColor:
                          getPriorityColor(notice.priority) + "20",
                        color: getPriorityColor(notice.priority),
                      }}
                    >
                      {notice.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showViewAll && viewAllPath && notices.length > 0 && (
        <a href={viewAllPath} className="view-all-link">
          View All Notices →
        </a>
      )}

      <style>{`
        .notices-feed {
          width: 100%;
        }
        .notices-feed.compact .notice-item {
          padding: 0.75rem;
        }
        .notices-loading,
        .notices-error,
        .notices-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 0.5rem;
          color: #64748b;
        }
        .notices-error {
          color: #dc2626;
        }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notice-item {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
        }
        .notice-item:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .notice-item.urgent {
          border-left: 3px solid #dc2626;
        }
        .notice-item.expanded {
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .notice-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .notice-priority-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .notice-title-row {
          flex: 1;
          min-width: 0;
        }
        .notice-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notice-meta {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }
        .expand-icon {
          color: #94a3b8;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .expand-icon.rotated {
          transform: rotate(90deg);
        }
        .notice-content {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .notice-content p {
          margin: 0;
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .notice-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px dashed #e2e8f0;
        }
        .notice-author {
          font-size: 0.75rem;
          color: #64748b;
        }
        .notice-priority-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .view-all-link {
          display: block;
          text-align: center;
          padding: 0.75rem;
          margin-top: 0.5rem;
          color: #3b82f6;
          font-size: 0.875rem;
          text-decoration: none;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default NoticesFeed;
