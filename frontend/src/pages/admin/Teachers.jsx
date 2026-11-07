import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Edit2 } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import {
  Input,
  Button,
  FormRow,
  FileUpload,
  Select,
} from "../../components/common/FormElements";
import { teacherService } from "../../api/teacherService";
import { uploadService } from "../../api/uploadService";

// Staff roles that can be created from this page
const STAFF_ROLES = [
  { value: "TEACHER", label: "Teacher" },
  { value: "EXAM_OFFICER", label: "Exam Officer" },
  { value: "ACCOUNTANT", label: "Accountant" },
];

const STAFF_ROLE_BADGE = {
  TEACHER: "badge-primary",
  EXAM_OFFICER: "badge-info",
  ACCOUNTANT: "badge-success",
};

const ROLE_HINTS = {
  TEACHER: "Teachers can only enter marks for their assigned subjects.",
  EXAM_OFFICER:
    "Exam Officers can enter marks for any subject without being assigned.",
  ACCOUNTANT: "Accountants manage fee types, structures and payments only.",
};

// The staff role this person currently holds (first matching staff role).
const currentStaffRole = (person) =>
  STAFF_ROLES.find((r) => person?.roles?.includes(r.value))?.value ||
  "TEACHER";

const roleLabelOf = (value) =>
  STAFF_ROLES.find((r) => r.value === value)?.label || value;

// Pull the server message and per-field validation errors out of an axios error.
// Backend shape: { success: false, message, errors: [{ field, message }] }.
const parseServerError = (error, fallback) => {
  const body = error?.response?.data || {};
  const fieldErrors = {};
  const otherErrors = [];
  (Array.isArray(body.errors) ? body.errors : []).forEach((e) => {
    if (e && typeof e === "object" && e.field) {
      fieldErrors[e.field] = fieldErrors[e.field] || e.message;
    } else if (e) {
      otherErrors.push(typeof e === "string" ? e : e.message);
    }
  });
  return {
    message: body.message || error?.message || fallback,
    fieldErrors,
    otherErrors: otherErrors.filter(Boolean),
  };
};

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url
    .replace(/^\\?/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/")}`;
};

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedRole, setSelectedRole] = useState("TEACHER");
  const [serverError, setServerError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
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
      const response = await teacherService.getTeachers({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      setTeachers(response.data?.teachers || response.data || []);
      if (response.data?.pagination) {
        setPagination((prev) => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (teacher = null) => {
    setEditingTeacher(teacher);
    setServerError(null);
    clearErrors();
    if (teacher) {
      reset({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
      });
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
    // role is sent on both create (POST /users) and update (PUT /teachers/:id).
    try {
      const payload = {
        ...data,
        avatarUrl: avatarUrl || undefined,
        role: selectedRole,
      };
      if (editingTeacher) {
        await teacherService.updateTeacher(editingTeacher.id, payload);
      } else {
        await teacherService.createTeacher(payload);
      }
      fetchTeachers();
      closeModal();
    } catch (error) {
      console.error("Error saving staff member:", error);
      const parsed = parseServerError(error, "Error saving staff member");
      const formFields = ["firstName", "lastName", "email", "phone", "password"];
      Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
        if (formFields.includes(field)) {
          setError(field, { type: "server", message });
        }
      });
      setServerError(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (files) => {
    const file = files && files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadService.uploadAvatar(file);
      const url = res?.data?.url || res?.url || res?.data?.data?.url;
      if (url) setAvatarUrl(url);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert(error.response?.data?.message || "Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const columns = [
    {
      header: "Staff Member",
      render: (row) => (
        <div className="user-cell">
          <span className="user-name">
            {row.firstName} {row.lastName}
          </span>
          <span className="user-email">{row.email}</span>
        </div>
      ),
    },
    {
      header: "Role",
      render: (row) => {
        const staffRoles = STAFF_ROLES.filter((r) =>
          (row.roles || []).includes(r.value),
        );
        if (staffRoles.length === 0) return "-";
        return (
          <div className="badge-list">
            {staffRoles.map((r) => (
              <span
                key={r.value}
                className={`badge ${STAFF_ROLE_BADGE[r.value] || ""}`}
              >
                {r.label}
              </span>
            ))}
          </div>
        );
      },
    },
    { header: "Phone", render: (row) => row.phone || "-" },
    {
      header: "Actions",
      width: "120px",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            onClick={() => openModal(row)}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Teachers & Staff</h1>
          <p className="text-muted">Manage teachers, exam officers, and accountants</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={teachers}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          searchValue={search}
          onSearchChange={setSearch}
          emptyMessage="No teachers found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Staff Member
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTeacher ? "Edit Staff Member" : "Add Staff Member"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="form-alert" role="alert">
              <strong>{serverError.message}</strong>
              {(serverError.otherErrors.length > 0 ||
                Object.keys(serverError.fieldErrors).length > 0) && (
                <ul>
                  {Object.entries(serverError.fieldErrors).map(
                    ([field, message]) => (
                      <li key={field}>
                        {field}: {message}
                      </li>
                    ),
                  )}
                  {serverError.otherErrors.map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <FormRow>
            <Input
              label="First Name"
              name="firstName"
              register={register}
              error={errors.firstName?.message}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              register={register}
              error={errors.lastName?.message}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              label="Email"
              name="email"
              type="email"
              register={register}
              error={errors.email?.message}
              required
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              register={register}
              error={errors.phone?.message}
            />
          </FormRow>
          <FormRow>
            <div className="form-group">
              <label htmlFor="staff-role">Role</label>
              <select
                id="staff-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-control"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {serverError?.fieldErrors?.role && (
                <span className="form-error">
                  {serverError.fieldErrors.role}
                </span>
              )}
              <small className="text-muted">
                {editingTeacher &&
                selectedRole !== currentStaffRole(editingTeacher)
                  ? `Changing role from ${roleLabelOf(
                      currentStaffRole(editingTeacher),
                    )} to ${roleLabelOf(selectedRole)}. `
                  : ""}
                {ROLE_HINTS[selectedRole]}
              </small>
            </div>
          </FormRow>
          <div className="form-group">
            <label>Profile Photo</label>
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={resolveAssetUrl(avatarUrl)}
                  alt="Avatar"
                  className="user-avatar-sm"
                />
              ) : (
                <div className="user-avatar-placeholder-sm">
                  {(editingTeacher?.firstName || "N")[0]}
                </div>
              )}
              <FileUpload
                label="Upload Avatar"
                accept="image/*"
                multiple={false}
                onChange={handleAvatarUpload}
              />
            </div>
            {uploadingAvatar && (
              <p className="text-sm text-muted">Uploading...</p>
            )}
          </div>
          {!editingTeacher && (
            <Input
              label="Password"
              name="password"
              type="password"
              register={register}
              error={errors.password?.message}
              required
              minLength={8}
            />
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingTeacher ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Teachers;
