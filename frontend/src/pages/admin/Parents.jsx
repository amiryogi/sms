import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Users,
  Plus,
  Link2,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import {
  Input,
  Select,
  Button,
  FormRow,
  Textarea,
} from "../../components/common/FormElements";
import { parentService } from "../../api/parentService";
import { studentService } from "../../api/studentService";

const relationshipOptions = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
];

const Parents = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createForm = useForm();
  const linkForm = useForm({
    defaultValues: { relationship: "guardian", isPrimary: false },
  });

  const loadParents = async (
    page = pagination.page,
    currentSearch = search
  ) => {
    setLoading(true);
    try {
      const response = await parentService.getParents({
        page,
        limit: pagination.limit,
        search: currentSearch,
      });
      const list = response.data || response.parents || [];
      const pager = response.pagination;
      setParents(Array.isArray(list) ? list : []);
      if (pager) {
        setPagination({
          page: pager.page,
          limit: pager.limit,
          total: pager.total,
          totalPages:
            pager.totalPages || Math.ceil(pager.total / pager.limit) || 1,
        });
      }
    } catch (error) {
      console.error("Error loading parents", error);
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (term = "") => {
    try {
      const response = await studentService.getStudents({
        page: 1,
        limit: 50,
        search: term,
      });
      const list = response.data || response.students || [];
      const options = Array.isArray(list)
        ? list.map((student) => ({
            value: student.id,
            label:
              `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
              student.email ||
              `Student ${student.id}`,
          }))
        : [];
      setStudentOptions(options);
    } catch (error) {
      console.error("Error loading students", error);
      setStudentOptions([]);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    loadStudents(studentSearch);
  }, [studentSearch]);

  const handleSearchChange = (value) => {
    setSearch(value);
    loadParents(1, value);
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
    loadParents(page);
  };

  const openCreateModal = () => {
    setCreateModalOpen(true);
    createForm.reset({ relationship: "guardian" });
    loadStudents();
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    createForm.reset();
  };

  const openLinkModal = (parent) => {
    setSelectedParent(parent);
    setLinkModalOpen(true);
    linkForm.reset({ relationship: "guardian", isPrimary: false });
    loadStudents();
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setSelectedParent(null);
    linkForm.reset({ relationship: "guardian", isPrimary: false });
  };

  const handleCreateParent = createForm.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        occupation: values.occupation,
        workplace: values.workplace,
        address: values.address,
        students: values.studentId
          ? [
              {
                studentId: parseInt(values.studentId, 10),
                relationship: values.relationship,
                isPrimary: true,
              },
            ]
          : [],
      };
      await parentService.createParent(payload);
      closeCreateModal();
      loadParents();
    } catch (error) {
      console.error("Error creating parent", error);
      alert(error.response?.data?.message || "Error creating parent");
    } finally {
      setSubmitting(false);
    }
  });

  const handleLinkStudent = linkForm.handleSubmit(async (values) => {
    if (!selectedParent) return;
    setSubmitting(true);
    try {
      await parentService.linkStudent(selectedParent.id, {
        studentId: parseInt(values.studentId, 10),
        relationship: values.relationship,
        isPrimary: values.isPrimary,
      });
      closeLinkModal();
      loadParents();
    } catch (error) {
      console.error("Error linking student", error);
      alert(error.response?.data?.message || "Error linking student");
    } finally {
      setSubmitting(false);
    }
  });

  const handleUnlink = async (parentId, studentId) => {
    if (!window.confirm("Remove this student from parent?")) return;
    try {
      await parentService.unlinkStudent(parentId, studentId);
      loadParents();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to unlink student");
    }
  };

  const handleToggleStatus = async (parent) => {
    const nextStatus = parent.status === "active" ? "inactive" : "active";
    try {
      await parentService.updateParent(parent.id, { status: nextStatus });
      loadParents();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update status");
    }
  };

  const handleResetPassword = async (parent) => {
    const newPassword = window.prompt("Enter new password for parent:");
    if (!newPassword) return;
    try {
      await parentService.updateParent(parent.id, { newPassword });
      alert("Password reset successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to reset password");
    }
  };

  const columns = [
    {
      header: "Parent",
      render: (row) => (
        <div className="user-cell">
          <div className="user-avatar-sm">
            {(row.firstName || "").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="user-name">
              {row.firstName} {row.lastName}
            </div>
            <div className="user-email">{row.email}</div>
          </div>
        </div>
      ),
    },
    { header: "Phone", accessor: "phone", render: (row) => row.phone || "-" },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`badge ${
            row.status === "active" ? "badge-success" : "badge-secondary"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Linked Students",
      render: (row) => (
        <div className="chip-group">
          {row.linkedStudents?.length === 0 && (
            <span className="text-muted">None</span>
          )}
          {row.linkedStudents?.map((ls) => (
            <span
              key={`${row.id}-${ls.studentId}`}
              className={`chip ${ls.isPrimary ? "chip-primary" : ""}`}
            >
              {ls.studentName} ({ls.relationship})
              <button
                className="chip-action"
                title="Unlink"
                onClick={() => handleUnlink(row.id, ls.studentId)}
              >
                <Unlink size={14} />
              </button>
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="table-actions">
          <button
            className="btn btn-outline"
            onClick={() => openLinkModal(row)}
          >
            <LinkIcon size={16} /> Link
          </button>
          <button
            className="btn btn-outline"
            onClick={() => handleResetPassword(row)}
          >
            <KeyRound size={16} /> Reset
          </button>
          <button
            className="btn btn-outline"
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === "active" ? (
              <>
                <ShieldOff size={16} /> Deactivate
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Activate
              </>
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <Users className="inline-icon" /> Parents
          </h1>
          <p className="text-muted">
            Manage parent accounts, links, and access
          </p>
        </div>
        <div className="header-actions">
          <Button onClick={loadParents} icon={RefreshCw} variant="secondary">
            Refresh
          </Button>
          <Button onClick={openCreateModal} icon={Plus}>
            Create Parent
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={parents}
        loading={loading}
        searchValue={search}
        onSearchChange={handleSearchChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No parents found"
      />

      {/* Create Parent Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        title="Create Parent"
        size="lg"
      >
        <form onSubmit={handleCreateParent} className="form-grid">
          <FormRow>
            <Input
              label="First Name"
              name="firstName"
              register={createForm.register}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              register={createForm.register}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              type="email"
              label="Email"
              name="email"
              register={createForm.register}
              required
            />
            <Input
              type="tel"
              label="Phone"
              name="phone"
              register={createForm.register}
            />
          </FormRow>
          <FormRow>
            <Input
              type="password"
              label="Password"
              name="password"
              register={createForm.register}
              required
              minLength={8}
            />
            <Select
              label="Relationship"
              name="relationship"
              register={createForm.register}
              options={relationshipOptions}
              placeholder="Select relationship"
              defaultValue="guardian"
            />
          </FormRow>
          <FormRow>
            <Input
              label="Occupation"
              name="occupation"
              register={createForm.register}
            />
            <Input
              label="Workplace"
              name="workplace"
              register={createForm.register}
            />
          </FormRow>
          <Textarea
            label="Address"
            name="address"
            register={createForm.register}
            rows={2}
          />
          <FormRow>
            <Select
              label="Link Student"
              name="studentId"
              register={createForm.register}
              options={studentOptions}
              placeholder="Search and select student"
              required
            />
            <Input
              label="Search Students"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Type to search"
            />
          </FormRow>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreateModal}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Parent
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Student Modal */}
      <Modal
        isOpen={linkModalOpen}
        onClose={closeLinkModal}
        title={`Link Student to ${selectedParent?.firstName || "Parent"}`}
        size="md"
      >
        <form onSubmit={handleLinkStudent}>
          <Select
            label="Student"
            name="studentId"
            register={linkForm.register}
            options={studentOptions}
            placeholder="Search and select student"
            required
          />
          <Input
            label="Search Students"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Type to search"
          />
          <Select
            label="Relationship"
            name="relationship"
            register={linkForm.register}
            options={relationshipOptions}
            defaultValue="guardian"
          />
          <label className="checkbox">
            <input type="checkbox" {...linkForm.register("isPrimary")} />{" "}
            Primary guardian
          </label>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeLinkModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={Link2}>
              Link Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Parents;
