import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Plus, Pencil, Trash2, Send, Archive, Eye, Megaphone, Users, BookOpen, Globe, X, Info } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Textarea, Button, FormRow } from "../../components/common/FormElements";
import { PageHeader, Badge, IconButton, Tabs, SelectInput, DialogActions, toast, confirmDialog } from "../../components/ui";
import { cn } from "../../lib/cn";
import { noticeService } from "../../api/noticeService";
import { academicService } from "../../api/academicService";
import { formatDate, formatDateTime, toDateInput } from "../../utils/format";

const TARGET_TYPES = [
  { value: "GLOBAL", label: "Everyone", icon: Globe, hint: "All staff, students and parents" },
  { value: "ROLE_SPECIFIC", label: "Specific roles", icon: Users, hint: "e.g. only teachers, or only parents" },
  { value: "CLASS_SPECIFIC", label: "Specific classes", icon: BookOpen, hint: "Students and parents of chosen classes" },
];

const PRIORITIES = [
  { value: "low", label: "Low", tone: "neutral" },
  { value: "normal", label: "Normal", tone: "info" },
  { value: "high", label: "High", tone: "warning" },
  { value: "urgent", label: "Urgent", tone: "danger" },
];

const STATUS = {
  DRAFT: { tone: "warning", label: "Draft" },
  PUBLISHED: { tone: "success", label: "Published" },
  ARCHIVED: { tone: "neutral", label: "Archived" },
};

// Friendly labels keyed by role NAME. Role ids differ between databases, so
// the ids always come from GET /users/roles; never hardcode them here.
const ROLE_LABELS = {
  SUPER_ADMIN: "Super administrators",
  ADMIN: "Administrators",
  TEACHER: "Teachers",
  EXAM_OFFICER: "Exam officers",
  ACCOUNTANT: "Accountants",
  STUDENT: "Students",
  PARENT: "Parents",
};
const roleLabel = (name) =>
  ROLE_LABELS[name] || String(name || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const priorityOf = (p) => PRIORITIES.find((x) => x.value === p) || PRIORITIES[1];

const Audience = ({ targetType, roleTargets, classTargets }) => {
  if (targetType === "ROLE_SPECIFIC") {
    const roles = roleTargets?.map((r) => roleLabel(r.roleName)).join(", ") || "Roles";
    return <span className="inline-flex items-center gap-1.5 text-sm text-slate-600" title={roles}><Users size={14} className="text-slate-400" aria-hidden="true" /> <span className="max-w-48 truncate">{roles}</span></span>;
  }
  if (targetType === "CLASS_SPECIFIC") {
    const list = classTargets?.map((c) => c.className + (c.sectionName ? ` ${c.sectionName}` : "")).join(", ") || "Classes";
    return <span className="inline-flex items-center gap-1.5 text-sm text-slate-600" title={list}><BookOpen size={14} className="text-slate-400" aria-hidden="true" /> <span className="max-w-48 truncate">{list}</span></span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><Globe size={14} className="text-slate-400" aria-hidden="true" /> Everyone</span>;
};

const ChipToggle = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ring-inset",
      active ? "bg-brand-600 text-brand-fg ring-brand-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
    )}
  >
    {children}
  </button>
);

const RoleSelector = ({ roles = [], rolesError = false, value = [], onChange }) => (
  <div className="mb-4">
    <p className="mb-2 text-sm font-medium text-slate-700">Who should see it</p>
    {rolesError ? (
      <p className="text-sm text-red-600">Could not load roles. Close this form and try again.</p>
    ) : roles.length === 0 ? (
      <p className="text-sm text-slate-500">Loading roles…</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <ChipToggle
            key={role.id}
            active={value.includes(role.id)}
            onClick={() => onChange(value.includes(role.id) ? value.filter((id) => id !== role.id) : [...value, role.id])}
          >
            {roleLabel(role.name)}
          </ChipToggle>
        ))}
      </div>
    )}
  </div>
);

const ClassSelector = ({ classes, sections, value = [], onChange }) => {
  const add = (classId, sectionId = null) => {
    if (!value.some((v) => v.classId === classId && v.sectionId === sectionId)) onChange([...value, { classId, sectionId }]);
  };
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium text-slate-700">Which classes</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectInput
          aria-label="Add a whole class"
          value=""
          onChange={(e) => {
            const classId = parseInt(e.target.value);
            if (classId) add(classId, null);
          }}
        >
          <option value="">Add a whole class…</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </SelectInput>
        <SelectInput
          aria-label="Add one section"
          value=""
          onChange={(e) => {
            const [classId, sectionId] = e.target.value.split("-").map(Number);
            if (classId && sectionId) add(classId, sectionId);
          }}
        >
          <option value="">Add one section…</option>
          {classes.map((cls) =>
            sections.map((sec) => (
              <option key={`${cls.id}-${sec.id}`} value={`${cls.id}-${sec.id}`}>{cls.name} {sec.name}</option>
            )),
          )}
        </SelectInput>
      </div>
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.map((t, idx) => {
            const cls = classes.find((c) => c.id === t.classId);
            const sec = sections.find((s) => s.id === t.sectionId);
            const label = `${cls?.name || "Class"}${sec ? ` ${sec.name}` : " (all sections)"}`;
            return (
              <span key={`${t.classId}-${t.sectionId}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm text-brand-800 ring-1 ring-brand-200 ring-inset">
                {label}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label={`Remove ${label}`}
                  className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-brand-100"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EMPTY_FORM = {
  title: "",
  content: "",
  targetType: "GLOBAL",
  priority: "normal",
  publishFrom: "",
  publishTo: "",
  roleTargets: [],
  classTargets: [],
};

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesError, setRolesError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_FORM });

  const watchTargetType = watch("targetType");

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.page, limit: pagination.limit };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const response = await noticeService.getNotices(params);
      setNotices(response.data || []);
      if (response.pagination) {
        setPagination((prev) => ({ ...prev, total: response.pagination.total, totalPages: response.pagination.totalPages }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load notices");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchMetadata = async () => {
    try {
      const [classesRes, sectionsRes] = await Promise.all([academicService.getClasses(), academicService.getSections()]);
      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
    } catch {
      // Class targeting just shows empty lists.
    }
    try {
      const rolesRes = await noticeService.getRoles();
      setRoles(rolesRes.data || []);
      setRolesError(false);
    } catch {
      setRolesError(true);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const openCreateModal = () => {
    setEditingNotice(null);
    reset(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    reset({
      title: notice.title,
      content: notice.content,
      targetType: notice.targetType,
      priority: notice.priority,
      publishFrom: toDateInput(notice.publishFrom),
      publishTo: toDateInput(notice.publishTo),
      roleTargets: notice.roleTargets?.map((r) => r.roleId) || [],
      classTargets: notice.classTargets?.map((c) => ({ classId: c.classId, sectionId: c.sectionId })) || [],
    });
    setModalOpen(true);
  };

  const openViewModal = async (noticeId) => {
    try {
      const response = await noticeService.getNotice(noticeId);
      setViewingNotice(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the notice");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNotice(null);
    reset();
  };

  const onSubmit = async (data) => {
    if (data.targetType === "ROLE_SPECIFIC" && !data.roleTargets.length) return toast.info("Choose at least one role.");
    if (data.targetType === "CLASS_SPECIFIC" && !data.classTargets.length) return toast.info("Add at least one class.");
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
      if (data.targetType === "ROLE_SPECIFIC") payload.roleTargets = data.roleTargets;
      else if (data.targetType === "CLASS_SPECIFIC") payload.classTargets = data.classTargets;

      if (editingNotice) {
        await noticeService.updateNotice(editingNotice.id, payload);
        toast.success("Notice updated");
      } else {
        await noticeService.createNotice(payload);
        toast.success("Notice saved as a draft. Publish it when it's ready.");
      }
      fetchNotices();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the notice");
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (notice, action) => {
    const config = {
      publish: { title: `Publish "${notice.title}"?`, message: "It becomes visible to its audience straight away.", confirmLabel: "Publish", run: noticeService.publishNotice, done: "Notice published" },
      archive: { title: `Archive "${notice.title}"?`, message: "It will no longer be shown to anyone.", confirmLabel: "Archive", run: noticeService.archiveNotice, done: "Notice archived" },
      delete: { title: `Delete "${notice.title}"?`, message: "This cannot be undone.", confirmLabel: "Delete", tone: "danger", run: noticeService.deleteNotice, done: "Notice deleted" },
    }[action];
    const ok = await confirmDialog({ title: config.title, message: config.message, confirmLabel: config.confirmLabel, tone: config.tone });
    if (!ok) return;
    try {
      await config.run(notice.id);
      toast.success(config.done);
      setViewingNotice(null);
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the notice");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const columns = [
    {
      header: "Notice",
      render: (row) => (
        <div className="min-w-0 max-w-md">
          <button
            type="button"
            onClick={() => openViewModal(row.id)}
            className="block max-w-full cursor-pointer truncate text-left font-medium text-slate-900 hover:text-brand-700 hover:underline"
          >
            {row.title}
          </button>
          <p className="truncate text-xs text-slate-500">
            {row.createdBy?.firstName} {row.createdBy?.lastName} · {formatDate(row.createdAt)}
          </p>
        </div>
      ),
    },
    { header: "Audience", render: (row) => <Audience {...row} /> },
    {
      header: "Priority",
      render: (row) => {
        const p = priorityOf(row.priority);
        return <Badge tone={p.tone}>{p.label}</Badge>;
      },
    },
    {
      header: "Visible",
      render: (row) =>
        !row.publishFrom && !row.publishTo ? (
          <span className="text-sm text-slate-400">Always</span>
        ) : (
          <span className="text-sm whitespace-nowrap text-slate-600">
            {row.publishFrom ? formatDate(row.publishFrom) : "Now"} – {row.publishTo ? formatDate(row.publishTo) : "no end"}
          </span>
        ),
    },
    {
      header: "Status",
      render: (row) => {
        const s = STATUS[row.status] || STATUS.DRAFT;
        return <Badge tone={s.tone} dot>{s.label}</Badge>;
      },
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "170px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Eye} label="View notice" onClick={() => openViewModal(row.id)} />
          {row.status === "DRAFT" && (
            <>
              <IconButton icon={Pencil} label="Edit notice" onClick={() => openEditModal(row)} />
              <IconButton icon={Send} label="Publish notice" onClick={() => act(row, "publish")} />
              <IconButton icon={Trash2} label="Delete notice" variant="danger-soft" onClick={() => act(row, "delete")} />
            </>
          )}
          {row.status === "PUBLISHED" && <IconButton icon={Archive} label="Archive notice" onClick={() => act(row, "archive")} />}
        </div>
      ),
    },
  ];

  const v = viewingNotice;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        icon={Megaphone}
        title="Notices"
        description="Announcements for the whole school, particular roles or particular classes."
        actions={<Button icon={Plus} onClick={openCreateModal}>New Notice</Button>}
        className="mb-2"
      />

      <Tabs
        value={filters.status}
        onChange={(value) => handleFilterChange("status", value)}
        tabs={[
          { value: "", label: "All" },
          { value: "DRAFT", label: "Drafts" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />

      <DataTable
        columns={columns}
        data={notices}
        loading={loading}
        searchValue={filters.search}
        onSearchChange={(value) => handleFilterChange("search", value)}
        searchPlaceholder="Search notices…"
        toolbar={
          <div className="w-full sm:w-40">
            <SelectInput aria-label="Priority" value={filters.priority} onChange={(e) => handleFilterChange("priority", e.target.value)}>
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </SelectInput>
          </div>
        }
        pagination={pagination.totalPages > 1 ? pagination : null}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={filters.search || filters.status || filters.priority ? "No notices match" : "No notices yet"}
        emptyDescription={filters.search || filters.status || filters.priority ? undefined : "Write the first announcement for your school."}
        emptyIcon={Megaphone}
      />

      {/* Create / edit */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingNotice ? "Edit notice" : "New notice"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input label="Title" name="title" placeholder="e.g. School closed on Friday" register={register} error={errors.title?.message} required />
          <Textarea label="Message" name="content" placeholder="Write the notice…" register={register} error={errors.content?.message} rows={6} required />

          <Controller
            name="targetType"
            control={control}
            render={({ field }) => (
              <fieldset className="mb-4">
                <legend className="mb-2 text-sm font-medium text-slate-700">Audience</legend>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                  {TARGET_TYPES.map((t) => {
                    const active = field.value === t.value;
                    return (
                      <label
                        key={t.value}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors",
                          active ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-400" : "border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <input
                            type="radio"
                            name="targetType"
                            value={t.value}
                            checked={active}
                            onChange={() => {
                              field.onChange(t.value);
                              setValue("roleTargets", []);
                              setValue("classTargets", []);
                            }}
                          />
                          {t.label}
                        </span>
                        <span className="text-xs text-slate-500">{t.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          {watchTargetType === "ROLE_SPECIFIC" && (
            <Controller
              name="roleTargets"
              control={control}
              render={({ field }) => <RoleSelector roles={roles} rolesError={rolesError} value={field.value} onChange={field.onChange} />}
            />
          )}
          {watchTargetType === "CLASS_SPECIFIC" && (
            <Controller
              name="classTargets"
              control={control}
              render={({ field }) => <ClassSelector classes={classes} sections={sections} value={field.value} onChange={field.onChange} />}
            />
          )}

          <FormRow>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  label="Priority"
                  name="priority"
                  options={PRIORITIES}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={null}
                />
              )}
            />
            <Input label="Show from" name="publishFrom" type="date" register={register} hint="Optional" />
            <Input label="Show until" name="publishTo" type="date" register={register} hint="Optional" />
          </FormRow>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={14} aria-hidden="true" />
            {editingNotice ? "Only drafts can be edited." : "Saved as a draft. You can publish it after reviewing."}
          </p>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingNotice ? "Save changes" : "Save draft"}</Button>
          </DialogActions>
        </form>
      </Modal>

      {/* View */}
      <Modal isOpen={Boolean(v)} onClose={() => setViewingNotice(null)} title="Notice" size="lg">
        {v && (
          <article>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={(STATUS[v.status] || STATUS.DRAFT).tone} dot>{(STATUS[v.status] || STATUS.DRAFT).label}</Badge>
              <Badge tone={priorityOf(v.priority).tone}>{priorityOf(v.priority).label} priority</Badge>
              <Audience {...v} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{v.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {v.createdBy?.firstName} {v.createdBy?.lastName} · {formatDateTime(v.createdAt)}
            </p>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-800">{v.content}</div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              {v.publishedAt && (
                <div><dt className="text-slate-500">Published</dt><dd className="font-medium text-slate-900">{formatDateTime(v.publishedAt)}</dd></div>
              )}
              {v.archivedAt && (
                <div><dt className="text-slate-500">Archived</dt><dd className="font-medium text-slate-900">{formatDateTime(v.archivedAt)}</dd></div>
              )}
              {(v.publishFrom || v.publishTo) && (
                <div>
                  <dt className="text-slate-500">Visible</dt>
                  <dd className="font-medium text-slate-900">{v.publishFrom ? formatDate(v.publishFrom) : "Now"} – {v.publishTo ? formatDate(v.publishTo) : "no end"}</dd>
                </div>
              )}
            </dl>
          </article>
        )}
        <DialogActions>
          {v?.status === "DRAFT" && (
            <>
              <Button variant="secondary" icon={Pencil} onClick={() => { const n = v; setViewingNotice(null); openEditModal(n); }}>Edit</Button>
              <Button icon={Send} onClick={() => act(v, "publish")}>Publish</Button>
            </>
          )}
          {v?.status === "PUBLISHED" && <Button variant="secondary" icon={Archive} onClick={() => act(v, "archive")}>Archive</Button>}
          <Button variant="secondary" onClick={() => setViewingNotice(null)}>Close</Button>
        </DialogActions>
      </Modal>
    </div>
  );
};

export default Notices;
