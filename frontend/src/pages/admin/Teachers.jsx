import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, UsersRound, Mail, Phone } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Button, FormRow } from "../../components/common/FormElements";
import AvatarUpload from "../../components/common/AvatarUpload";
import { PageHeader, Badge, Avatar, IconButton, Alert, DialogActions, toast } from "../../components/ui";
import { cn } from "../../lib/cn";
import { teacherService } from "../../api/teacherService";
import { fullName } from "../../utils/format";

// Staff roles that can be created and edited from this page
const STAFF_ROLES = [
  { value: "TEACHER", label: "Teacher", tone: "brand", hint: "Enters marks and attendance only for the subjects and sections assigned to them." },
  { value: "EXAM_OFFICER", label: "Exam Officer", tone: "info", hint: "Enters marks for any subject without an assignment. No access to fees." },
  { value: "ACCOUNTANT", label: "Accountant", tone: "success", hint: "Manages fee types, structures and payments. Read-only student directory." },
];

// The staff role this person currently holds (first matching staff role).
const currentStaffRole = (person) => STAFF_ROLES.find((r) => person?.roles?.includes(r.value))?.value || "TEACHER";
const roleOf = (value) => STAFF_ROLES.find((r) => r.value === value);

// Server message and per-field errors. Shape: { success, message, errors: [{ field, message }] }.
const parseServerError = (error, fallback) => {
  const body = error?.response?.data || {};
  const fieldErrors = {};
  const otherErrors = [];
  (Array.isArray(body.errors) ? body.errors : []).forEach((e) => {
    if (e && typeof e === "object" && e.field) fieldErrors[e.field] = fieldErrors[e.field] || e.message;
    else if (e) otherErrors.push(typeof e === "string" ? e : e.message);
  });
  return { message: body.message || error?.message || fallback, fieldErrors, otherErrors: otherErrors.filter(Boolean) };
};

const FORM_FIELDS = ["firstName", "middleName", "lastName", "username", "email", "phone", "password"];

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedRole, setSelectedRole] = useState("TEACHER");
  const [serverError, setServerError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchTeachers();
  }, [pagination.page, search]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await teacherService.getTeachers({ page: pagination.page, limit: pagination.limit, search });
      setTeachers(response.data?.teachers || response.data || []);
      // The API returns { data: [...], pagination } at the top level.
      const pager = response.pagination || response.data?.pagination;
      if (pager) setPagination((prev) => ({ ...prev, ...pager }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load staff");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (teacher = null) => {
    setEditingTeacher(teacher);
    setServerError(null);
    clearErrors();
    if (teacher) {
      reset({ firstName: teacher.firstName, middleName: teacher.middleName || "", lastName: teacher.lastName, username: teacher.username || "", email: teacher.email || "", phone: teacher.phone });
      setAvatarUrl(teacher.avatarUrl || "");
      setSelectedRole(currentStaffRole(teacher));
    } else {
      reset({});
      setAvatarUrl("");
      setSelectedRole("TEACHER");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTeacher(null);
    setAvatarUrl("");
    setSelectedRole("TEACHER");
    setServerError(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError(null);
    clearErrors();
    try {
      // role is sent on both create (POST /users) and update (PUT /teachers/:id).
      const payload = { ...data, avatarUrl: avatarUrl || undefined, role: selectedRole };
      if (editingTeacher) {
        await teacherService.updateTeacher(editingTeacher.id, payload);
        toast.success("Staff member updated");
      } else {
        await teacherService.createTeacher(payload);
        toast.success(`${roleOf(selectedRole)?.label || "Staff member"} added`);
      }
      fetchTeachers();
      closeModal();
    } catch (error) {
      const parsed = parseServerError(error, "Could not save the staff member");
      Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
        if (FORM_FIELDS.includes(field)) setError(field, { type: "server", message });
      });
      setServerError(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  const name = (row) => fullName(row);
  const roleChanged = editingTeacher && selectedRole !== currentStaffRole(editingTeacher);
  const unshownErrors = serverError
    ? [
        ...Object.entries(serverError.fieldErrors)
          .filter(([field]) => !FORM_FIELDS.includes(field))
          .map(([, m]) => m),
        ...serverError.otherErrors,
      ]
    : [];

  const columns = [
    {
      header: "Staff member",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={row.avatarUrl} name={name(row)} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{name(row)}</p>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              <span className="font-mono">{row.username}</span>
              {row.email && (
                <>
                  <Mail size={11} aria-hidden="true" className="ml-1" /> {row.email}
                </>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      render: (row) => {
        const roles = STAFF_ROLES.filter((r) => (row.roles || []).includes(r.value));
        if (!roles.length) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <Badge key={r.value} tone={r.tone}>{r.label}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      header: "Phone",
      render: (row) =>
        row.phone ? (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <Phone size={13} className="text-slate-400" aria-hidden="true" /> {row.phone}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "56px",
      render: (row) => (
        <div className="flex justify-end">
          <IconButton icon={Pencil} label={`Edit ${name(row)}`} onClick={() => openModal(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={UsersRound}
        title="Teachers & Staff"
        description="Teachers, exam officers and accountants, with their sign-in details."
        actions={<Button icon={Plus} onClick={() => openModal()}>Add staff member</Button>}
      />

      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search name, username or email…"
        emptyMessage={search ? "No staff match your search" : "No staff yet"}
        emptyIcon={UsersRound}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTeacher ? "Edit staff member" : "Add staff member"}
        description={editingTeacher ? name(editingTeacher) : undefined}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <Alert tone="danger" title={serverError.message}>
              {unshownErrors.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {unshownErrors.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}

          <AvatarUpload url={avatarUrl} name={editingTeacher ? name(editingTeacher) : ""} onChange={setAvatarUrl} />

          <div>
            <FormRow>
              <Input label="First name" name="firstName" register={register} error={errors.firstName?.message} required />
              <Input label="Middle name" name="middleName" register={register} error={errors.middleName?.message} />
              <Input label="Last name" name="lastName" register={register} error={errors.lastName?.message} required />
            </FormRow>
            <FormRow>
              <Input
                label="Username"
                name="username"
                register={register}
                error={errors.username?.message}
                autoCapitalize="none"
                spellCheck={false}
                hint={editingTeacher ? "Used to sign in." : "Leave empty to use the email's first part, or first.last."}
              />
              <Input label="Email (optional)" name="email" type="email" register={register} error={errors.email?.message} />
            </FormRow>
            <FormRow>
              <Input label="Phone" name="phone" type="tel" register={register} error={errors.phone?.message} />
            </FormRow>
            {!editingTeacher && (
              <Input
                label="Password"
                name="password"
                type="password"
                register={register}
                error={errors.password?.message}
                required
                minLength={8}
                hint="At least 8 characters. They sign in with their username (or email) and this password."
              />
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Role</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {STAFF_ROLES.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <label
                    key={r.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition-colors",
                      active ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-400" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <input
                        type="radio"
                        name="staff-role"
                        value={r.value}
                        checked={active}
                        onChange={() => setSelectedRole(r.value)}
                      />
                      {r.label}
                    </span>
                    <span className="text-xs text-slate-500">{r.hint}</span>
                  </label>
                );
              })}
            </div>
            {serverError?.fieldErrors?.role && <p className="mt-1 text-xs font-medium text-red-600">{serverError.fieldErrors.role}</p>}
            {roleChanged && (
              <p className="mt-2 text-xs text-amber-700">
                Changing role from {roleOf(currentStaffRole(editingTeacher))?.label} to {roleOf(selectedRole)?.label}.
              </p>
            )}
          </fieldset>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingTeacher ? "Save changes" : "Add staff member"}</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default Teachers;
