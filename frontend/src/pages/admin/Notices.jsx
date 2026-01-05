import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  Send,
  Archive,
  Eye,
  Filter,
  Search,
  AlertCircle,
  Bell,
  Users,
  BookOpen,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import {
  Input,
  Select,
  Textarea,
  Button,
  FormRow,
} from "../../components/common/FormElements";
import { noticeService } from "../../api/noticeService";
import { academicService } from "../../api/academicService";
import { useAuth } from "../../context/AuthContext";

// =============================================================================
// CONSTANTS
// =============================================================================

const TARGET_TYPES = [
  { value: "GLOBAL", label: "School-Wide (Everyone)" },
  { value: "ROLE_SPECIFIC", label: "Specific Roles" },
  { value: "CLASS_SPECIFIC", label: "Specific Classes" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const AVAILABLE_ROLES = [
  { id: 2, name: "ADMIN", label: "Administrators" },
  { id: 3, name: "TEACHER", label: "Teachers" },
  { id: 4, name: "STUDENT", label: "Students" },
  { id: 5, name: "PARENT", label: "Parents" },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatusBadge = ({ status }) => {
  const statusStyles = {
    DRAFT: "badge-warning",
    PUBLISHED: "badge-success",
    ARCHIVED: "badge-secondary",
  };
  return (
    <span className={`badge ${statusStyles[status] || ""}`}>{status}</span>
  );
};

const PriorityBadge = ({ priority }) => {
  const priorityStyles = {
    low: "badge-secondary",
    normal: "badge-info",
    high: "badge-warning",
    urgent: "badge-danger",
  };
  return (
    <span className={`badge ${priorityStyles[priority] || ""}`}>
      {priority?.toUpperCase()}
    </span>
  );
};

const TargetBadge = ({ targetType, roleTargets, classTargets }) => {
  if (targetType === "GLOBAL") {
    return (
      <span className="badge badge-primary">
        <Users size={12} /> Everyone
      </span>
    );
  }
  if (targetType === "ROLE_SPECIFIC") {
    const roles = roleTargets?.map((r) => r.roleName).join(", ") || "Roles";
    return (
      <span className="badge badge-info" title={roles}>
        <Users size={12} /> {roles}
      </span>
    );
  }
  if (targetType === "CLASS_SPECIFIC") {
    const classes =
      classTargets
        ?.map((c) => c.className + (c.sectionName ? `-${c.sectionName}` : ""))
        .join(", ") || "Classes";
    return (
      <span className="badge badge-warning" title={classes}>
        <BookOpen size={12} /> {classes}
      </span>
    );
  }
  return null;
};

// Multi-select for roles
const RoleSelector = ({ value = [], onChange }) => {
  const handleToggle = (roleId) => {
    if (value.includes(roleId)) {
      onChange(value.filter((id) => id !== roleId));
    } else {
      onChange([...value, roleId]);
    }
  };

  return (
    <div className="form-group">
      <label>Target Roles</label>
      <div className="checkbox-grid">
        {AVAILABLE_ROLES.map((role) => (
          <label key={role.id} className="checkbox-item">
            <input
              type="checkbox"
              checked={value.includes(role.id)}
              onChange={() => handleToggle(role.id)}
            />
            <span>{role.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Multi-select for classes/sections
const ClassSelector = ({ classes, sections, value = [], onChange }) => {
  const handleAddClass = (classId, sectionId = null) => {
    const exists = value.some(
      (v) => v.classId === classId && v.sectionId === sectionId
    );
    if (!exists) {
      onChange([...value, { classId, sectionId }]);
    }
  };

  const handleRemoveTarget = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group">
      <label>Target Classes</label>
      <div className="class-selector">
        <div className="class-selector-inputs">
          <select
            id="class-select"
            onChange={(e) => {
              const classId = parseInt(e.target.value);
              if (classId) handleAddClass(classId, null);
              e.target.value = "";
            }}
          >
            <option value="">Add entire class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <span className="or-separator">or</span>
          <select
            id="section-select"
            onChange={(e) => {
              const [classId, sectionId] = e.target.value
                .split("-")
                .map(Number);
              if (classId && sectionId) handleAddClass(classId, sectionId);
              e.target.value = "";
            }}
          >
            <option value="">Add class + section...</option>
            {classes.map((cls) =>
              sections.map((sec) => (
                <option
                  key={`${cls.id}-${sec.id}`}
                  value={`${cls.id}-${sec.id}`}
                >
                  {cls.name} - {sec.name}
                </option>
              ))
            )}
          </select>
        </div>
        {value.length > 0 && (
          <div className="selected-targets">
            {value.map((target, idx) => {
              const cls = classes.find((c) => c.id === target.classId);
              const sec = sections.find((s) => s.id === target.sectionId);
              return (
                <span key={idx} className="target-tag">
                  {cls?.name}
                  {sec ? ` - ${sec.name}` : " (All sections)"}
                  <button type="button" onClick={() => handleRemoveTarget(idx)}>
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Notices = () => {
  const { hasRole } = useAuth();
  const _isAdmin = hasRole("ADMIN") || hasRole("SUPER_ADMIN");

  // State
  const [notices, setNotices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      content: "",
      targetType: "GLOBAL",
      priority: "normal",
      publishFrom: "",
      publishTo: "",
      roleTargets: [],
      classTargets: [],
    },
  });

  const watchTargetType = watch("targetType");

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };
      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

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
  }, [filters, pagination.page, pagination.limit]);

  const fetchMetadata = async () => {
    try {
      const [classesRes, sectionsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getSections(),
      ]);
      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // =============================================================================
  // MODAL HANDLERS
  // =============================================================================

  const openCreateModal = () => {
    setEditingNotice(null);
    reset({
      title: "",
      content: "",
      targetType: "GLOBAL",
      priority: "normal",
      publishFrom: "",
      publishTo: "",
      roleTargets: [],
      classTargets: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    reset({
      title: notice.title,
      content: notice.content,
      targetType: notice.targetType,
      priority: notice.priority,
      publishFrom: notice.publishFrom ? notice.publishFrom.split("T")[0] : "",
      publishTo: notice.publishTo ? notice.publishTo.split("T")[0] : "",
      roleTargets: notice.roleTargets?.map((r) => r.roleId) || [],
      classTargets:
        notice.classTargets?.map((c) => ({
          classId: c.classId,
          sectionId: c.sectionId,
        })) || [],
    });
    setModalOpen(true);
  };

  const openViewModal = async (noticeId) => {
    try {
      const response = await noticeService.getNotice(noticeId);
      setViewingNotice(response.data);
      setViewModalOpen(true);
    } catch (error) {
      console.error("Error fetching notice:", error);
      alert("Error loading notice details");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNotice(null);
    reset();
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingNotice(null);
  };

  // =============================================================================
  // FORM SUBMISSION
  // =============================================================================

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        content: data.content,
        targetType: data.targetType,
        priority: data.priority,
        publishFrom: data.publishFrom || null,
        publishTo: data.publishTo || null,
      };

      // Add targeting data based on type
      if (data.targetType === "ROLE_SPECIFIC") {
        payload.roleTargets = data.roleTargets;
      } else if (data.targetType === "CLASS_SPECIFIC") {
        payload.classTargets = data.classTargets;
      }

      if (editingNotice) {
        await noticeService.updateNotice(editingNotice.id, payload);
      } else {
        await noticeService.createNotice(payload);
      }

      fetchNotices();
      closeModal();
    } catch (error) {
      console.error("Error saving notice:", error);
      alert(error.response?.data?.message || "Error saving notice");
    } finally {
      setSubmitting(false);
    }
  };

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const handlePublish = async (id) => {
    if (
      !confirm(
        "Publish this notice? It will become visible to the target audience."
      )
    )
      return;
    try {
      await noticeService.publishNotice(id);
      fetchNotices();
    } catch (error) {
      console.error("Error publishing notice:", error);
      alert(error.response?.data?.message || "Error publishing notice");
    }
  };

  const handleArchive = async (id) => {
    if (!confirm("Archive this notice? It will no longer be visible to users."))
      return;
    try {
      await noticeService.archiveNotice(id);
      fetchNotices();
    } catch (error) {
      console.error("Error archiving notice:", error);
      alert(error.response?.data?.message || "Error archiving notice");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this notice? This action cannot be undone.")) return;
    try {
      await noticeService.deleteNotice(id);
      fetchNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert(error.response?.data?.message || "Error deleting notice");
    }
  };

  // =============================================================================
  // FILTER HANDLERS
  // =============================================================================

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // =============================================================================
  // TABLE COLUMNS
  // =============================================================================

  const columns = [
    {
      header: "Title",
      accessor: "title",
      render: (row) => (
        <div>
          <strong>{row.title}</strong>
          <div className="text-muted text-sm">
            by {row.createdBy?.firstName} {row.createdBy?.lastName}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      width: "100px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Priority",
      accessor: "priority",
      width: "100px",
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: "Target",
      accessor: "targetType",
      width: "150px",
      render: (row) => (
        <TargetBadge
          targetType={row.targetType}
          roleTargets={row.roleTargets}
          classTargets={row.classTargets}
        />
      ),
    },
    {
      header: "Publish Window",
      width: "180px",
      render: (row) => {
        if (!row.publishFrom && !row.publishTo)
          return <span className="text-muted">Always</span>;
        const from = row.publishFrom
          ? new Date(row.publishFrom).toLocaleDateString()
          : "—";
        const to = row.publishTo
          ? new Date(row.publishTo).toLocaleDateString()
          : "—";
        return (
          <span>
            {from} → {to}
          </span>
        );
      },
    },
    {
      header: "Created",
      width: "120px",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      width: "180px",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            title="View"
            onClick={() => openViewModal(row.id)}
          >
            <Eye size={16} />
          </button>

          {row.status === "DRAFT" && (
            <>
              <button
                className="btn-icon"
                title="Edit"
                onClick={() => openEditModal(row)}
              >
                <Edit2 size={16} />
              </button>
              <button
                className="btn-icon btn-success"
                title="Publish"
                onClick={() => handlePublish(row.id)}
              >
                <Send size={16} />
              </button>
              <button
                className="btn-icon btn-danger"
                title="Delete"
                onClick={() => handleDelete(row.id)}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}

          {row.status === "PUBLISHED" && (
            <button
              className="btn-icon btn-warning"
              title="Archive"
              onClick={() => handleArchive(row.id)}
            >
              <Archive size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <Bell size={28} /> Notices
          </h1>
          <p className="text-muted">Create and manage school announcements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <Filter size={18} />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
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

      {/* Data Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={notices}
          loading={loading}
          emptyMessage="No notices found"
          actions={
            <Button icon={Plus} onClick={openCreateModal}>
              Create Notice
            </Button>
          }
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingNotice ? "Edit Notice" : "Create Notice"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Title"
            name="title"
            placeholder="Notice title"
            register={register}
            error={errors.title?.message}
            required
          />

          <Textarea
            label="Content"
            name="content"
            placeholder="Write your notice content here..."
            register={register}
            error={errors.content?.message}
            rows={6}
            required
          />

          <FormRow>
            <Controller
              name="targetType"
              control={control}
              render={({ field }) => (
                <Select
                  label="Target Audience"
                  options={TARGET_TYPES}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    // Reset targeting when type changes
                    setValue("roleTargets", []);
                    setValue("classTargets", []);
                  }}
                />
              )}
            />

            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  label="Priority"
                  options={PRIORITIES}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
          </FormRow>

          {/* Conditional targeting inputs */}
          {watchTargetType === "ROLE_SPECIFIC" && (
            <Controller
              name="roleTargets"
              control={control}
              render={({ field }) => (
                <RoleSelector value={field.value} onChange={field.onChange} />
              )}
            />
          )}

          {watchTargetType === "CLASS_SPECIFIC" && (
            <Controller
              name="classTargets"
              control={control}
              render={({ field }) => (
                <ClassSelector
                  classes={classes}
                  sections={sections}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}

          <FormRow>
            <Input
              label="Visible From (optional)"
              name="publishFrom"
              type="date"
              register={register}
            />
            <Input
              label="Visible Until (optional)"
              name="publishTo"
              type="date"
              register={register}
            />
          </FormRow>

          <div className="form-helper">
            <AlertCircle size={14} />
            <span>
              {editingNotice
                ? "Only DRAFT notices can be edited."
                : "Notice will be saved as DRAFT. You can publish it after review."}
            </span>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingNotice ? "Update Notice" : "Create Notice"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={closeViewModal}
        title="Notice Details"
        size="lg"
      >
        {viewingNotice && (
          <div className="notice-details">
            <div className="notice-header">
              <h2>{viewingNotice.title}</h2>
              <div className="notice-meta">
                <StatusBadge status={viewingNotice.status} />
                <PriorityBadge priority={viewingNotice.priority} />
                <TargetBadge
                  targetType={viewingNotice.targetType}
                  roleTargets={viewingNotice.roleTargets}
                  classTargets={viewingNotice.classTargets}
                />
              </div>
            </div>

            <div className="notice-content">
              <p>{viewingNotice.content}</p>
            </div>

            <div className="notice-info">
              <div className="info-row">
                <strong>Created by:</strong>
                <span>
                  {viewingNotice.createdBy?.firstName}{" "}
                  {viewingNotice.createdBy?.lastName}
                </span>
              </div>
              <div className="info-row">
                <strong>Created at:</strong>
                <span>
                  {new Date(viewingNotice.createdAt).toLocaleString()}
                </span>
              </div>
              {viewingNotice.publishedAt && (
                <div className="info-row">
                  <strong>Published at:</strong>
                  <span>
                    {new Date(viewingNotice.publishedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {viewingNotice.archivedAt && (
                <div className="info-row">
                  <strong>Archived at:</strong>
                  <span>
                    {new Date(viewingNotice.archivedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {(viewingNotice.publishFrom || viewingNotice.publishTo) && (
                <div className="info-row">
                  <strong>Visibility window:</strong>
                  <span>
                    {viewingNotice.publishFrom
                      ? new Date(viewingNotice.publishFrom).toLocaleDateString()
                      : "Start"}
                    {" → "}
                    {viewingNotice.publishTo
                      ? new Date(viewingNotice.publishTo).toLocaleDateString()
                      : "No end"}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {viewingNotice.status === "DRAFT" && (
                <>
                  <Button
                    variant="primary"
                    icon={Send}
                    onClick={() => {
                      handlePublish(viewingNotice.id);
                      closeViewModal();
                    }}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Edit2}
                    onClick={() => {
                      closeViewModal();
                      openEditModal(viewingNotice);
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
              {viewingNotice.status === "PUBLISHED" && (
                <Button
                  variant="warning"
                  icon={Archive}
                  onClick={() => {
                    handleArchive(viewingNotice.id);
                    closeViewModal();
                  }}
                >
                  Archive
                </Button>
              )}
              <Button variant="secondary" onClick={closeViewModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Inline styles for component-specific styling */}
      <style>{`
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
        }
        .search-group {
          flex: 1;
          min-width: 200px;
        }
        .search-group input {
          width: 100%;
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
        }
        .checkbox-item:hover {
          background: #f8fafc;
        }
        .class-selector-inputs {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .class-selector-inputs select {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .or-separator {
          color: #64748b;
          font-size: 0.875rem;
        }
        .selected-targets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .target-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #e2e8f0;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .target-tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #64748b;
        }
        .target-tag button:hover {
          color: #ef4444;
        }
        .form-helper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f0f9ff;
          border-radius: 6px;
          color: #0369a1;
          font-size: 0.875rem;
          margin: 1rem 0;
        }
        .notice-details .notice-header {
          margin-bottom: 1.5rem;
        }
        .notice-details .notice-header h2 {
          margin: 0 0 0.5rem 0;
        }
        .notice-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .notice-content {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          white-space: pre-wrap;
        }
        .notice-info {
          margin-bottom: 1.5rem;
        }
        .info-row {
          display: flex;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-row strong {
          min-width: 120px;
          color: #64748b;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination button:hover:not(:disabled) {
          background: #f8fafc;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-primary { background: #dbeafe; color: #1e40af; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-info { background: #e0f2fe; color: #0369a1; }
        .badge-secondary { background: #f1f5f9; color: #475569; }
        .text-sm { font-size: 0.875rem; }
        .text-muted { color: #64748b; }
        .btn-success { color: #166534; }
        .btn-warning { color: #92400e; }
      `}</style>
    </div>
  );
};

export default Notices;
