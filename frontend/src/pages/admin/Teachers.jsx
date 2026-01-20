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
];

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
    if (teacher) {
      reset({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
      });
      setAvatarUrl(teacher.avatarUrl || "");
      // Set role from existing teacher (if available)
      setSelectedRole(teacher.roles?.[0] || "TEACHER");
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
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
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
      console.error("Error saving teacher:", error);
      alert(error.response?.data?.message || "Error saving teacher");
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
        const roles = row.roles || [];
        if (roles.includes("EXAM_OFFICER")) {
          return <span className="badge badge-info">Exam Officer</span>;
        }
        if (roles.includes("TEACHER")) {
          return <span className="badge badge-primary">Teacher</span>;
        }
        return "-";
      }
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
          <p className="text-muted">Manage teachers and exam officers</p>
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
              Add Teacher
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTeacher ? "Edit Teacher" : "Add Teacher"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input
              label="First Name"
              name="firstName"
              register={register}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              register={register}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              label="Email"
              name="email"
              type="email"
              register={register}
              required
            />
            <Input label="Phone" name="phone" type="tel" register={register} />
          </FormRow>
          {!editingTeacher && (
            <FormRow>
              <div className="form-group">
                <label>Role</label>
                <select
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
                <small className="text-muted">
                  {selectedRole === "EXAM_OFFICER" 
                    ? "Exam Officers can enter marks for any subject without being assigned" 
                    : "Teachers can only enter marks for their assigned subjects"}
                </small>
              </div>
            </FormRow>
          )}
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
