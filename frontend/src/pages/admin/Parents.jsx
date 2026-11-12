import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Contact,
  Plus,
  Link2,
  X,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  KeyRound,
  MoreHorizontal,
  Search,
  Star,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button, FormRow, Textarea } from "../../components/common/FormElements";
import {
  PageHeader,
  Badge,
  Avatar,
  Checkbox,
  Menu,
  MenuItem,
  MenuSeparator,
  TextInput,
  DialogActions,
  toast,
  confirmDialog,
} from "../../components/ui";
import { parentService } from "../../api/parentService";
import { studentService } from "../../api/studentService";
import { fullName } from "../../utils/format";

const relationshipOptions = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
];

/** Search box + select for picking a student (server-side search). */
const StudentPicker = ({ register, options, search, onSearch, label = "Student", required }) => (
  <div className="mb-4 rounded-xl border border-slate-200 p-3">
    <TextInput
      icon={Search}
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search students by name…"
      aria-label="Search students"
      className="mb-2"
    />
    <Select
      label={label}
      name="studentId"
      register={register}
      options={options}
      placeholder={options.length ? "Select a student" : "No students found"}
      required={required}
      className="mb-0"
    />
  </div>
);

const Parents = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [passwordParent, setPasswordParent] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedParent, setSelectedParent] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createForm = useForm();
  const linkForm = useForm({ defaultValues: { relationship: "guardian", isPrimary: false } });

  const loadParents = async (page = pagination.page, currentSearch = search) => {
    setLoading(true);
    try {
      const response = await parentService.getParents({ page, limit: pagination.limit, search: currentSearch });
      const list = response.data || response.parents || [];
      const pager = response.pagination;
      setParents(Array.isArray(list) ? list : []);
      if (pager) {
        setPagination({
          page: pager.page,
          limit: pager.limit,
          total: pager.total,
          totalPages: pager.totalPages || Math.ceil(pager.total / pager.limit) || 1,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load parents");
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (term = "") => {
    try {
      const response = await studentService.getStudents({ page: 1, limit: 50, search: term });
      const list = response.data?.students || response.data || response.students || [];
      setStudentOptions(
        Array.isArray(list)
          ? list.map((s) => ({
              value: s.id,
              label: `${fullName(s) || s.email || `Student ${s.id}`}${s.class ? ` · ${s.class} ${s.section || ""}` : ""}`,
            }))
          : [],
      );
    } catch {
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
    setStudentSearch("");
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    createForm.reset();
  };

  const openLinkModal = (parent) => {
    setSelectedParent(parent);
    setLinkModalOpen(true);
    linkForm.reset({ relationship: "guardian", isPrimary: false });
    setStudentSearch("");
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setSelectedParent(null);
    linkForm.reset({ relationship: "guardian", isPrimary: false });
  };

  const handleCreateParent = createForm.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await parentService.createParent({
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        username: values.username || undefined,
        email: values.email || undefined,
        phone: values.phone,
        password: values.password,
        occupation: values.occupation,
        workplace: values.workplace,
        address: values.address,
        students: values.studentId
          ? [{ studentId: parseInt(values.studentId, 10), relationship: values.relationship, isPrimary: true }]
          : [],
      });
      toast.success("Parent account created");
      closeCreateModal();
      loadParents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the parent");
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
      toast.success("Student linked");
      closeLinkModal();
      loadParents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not link the student");
    } finally {
      setSubmitting(false);
    }
  });

  const handleUnlink = async (parent, link) => {
    const ok = await confirmDialog({
      title: `Unlink ${link.studentName}?`,
      message: `${fullName(parent)} will no longer see this student's results, attendance or fees.`,
      confirmLabel: "Unlink",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await parentService.unlinkStudent(parent.id, link.studentId);
      toast.success("Student unlinked");
      loadParents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not unlink the student");
    }
  };

  const handleToggleStatus = async (parent) => {
    const deactivating = parent.status === "active";
    if (deactivating) {
      const ok = await confirmDialog({
        title: `Deactivate ${fullName(parent)}?`,
        message: "They will not be able to sign in until the account is activated again.",
        confirmLabel: "Deactivate",
        tone: "danger",
      });
      if (!ok) return;
    }
    try {
      await parentService.updateParent(parent.id, { status: deactivating ? "inactive" : "active" });
      toast.success(deactivating ? "Account deactivated" : "Account activated");
      loadParents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the account");
    }
  };

  const submitPasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("Use at least 8 characters.");
    setSubmitting(true);
    try {
      await parentService.updateParent(passwordParent.id, { newPassword });
      toast.success("Password reset. Share it with the parent securely.");
      setPasswordParent(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset the password");
    } finally {
      setSubmitting(false);
    }
  };

  const name = (p) => fullName(p);

  const columns = [
    {
      header: "Parent",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name(row)} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{name(row)}</p>
            <p className="truncate text-xs text-slate-500">
              <span className="font-mono">{row.username}</span>
              {row.email ? ` · ${row.email}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    { header: "Phone", render: (row) => row.phone || <span className="text-slate-400">—</span> },
    {
      header: "Children",
      render: (row) =>
        !row.linkedStudents?.length ? (
          <span className="text-slate-400">None linked</span>
        ) : (
          <div className="flex max-w-md flex-wrap gap-1.5">
            {row.linkedStudents.map((ls) => (
              <span
                key={`${row.id}-${ls.studentId}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2.5 text-xs text-slate-700"
              >
                {ls.isPrimary && <Star size={11} className="text-amber-500" aria-label="Primary guardian" />}
                {ls.studentName}
                <span className="text-slate-400 capitalize">· {ls.relationship}</span>
                <button
                  type="button"
                  onClick={() => handleUnlink(row, ls)}
                  aria-label={`Unlink ${ls.studentName}`}
                  className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ),
    },
    {
      header: "Status",
      render: (row) =>
        row.status === "active" ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Inactive</Badge>,
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "56px",
      render: (row) => (
        <div className="flex justify-end">
          <Menu
            trigger={({ toggle, ...aria }) => (
              <button
                type="button"
                onClick={toggle}
                {...aria}
                aria-label={`Actions for ${name(row)}`}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
            )}
          >
            <MenuItem icon={Link2} onClick={() => openLinkModal(row)}>Link a student</MenuItem>
            <MenuItem icon={KeyRound} onClick={() => setPasswordParent(row)}>Reset password</MenuItem>
            <MenuSeparator />
            {row.status === "active" ? (
              <MenuItem icon={ShieldOff} danger onClick={() => handleToggleStatus(row)}>Deactivate account</MenuItem>
            ) : (
              <MenuItem icon={ShieldCheck} onClick={() => handleToggleStatus(row)}>Activate account</MenuItem>
            )}
          </Menu>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Contact}
        title="Parents"
        description="Parent accounts and the children each one can follow."
        actions={
          <>
            <Button onClick={() => loadParents()} icon={RefreshCw} variant="secondary">Refresh</Button>
            <Button onClick={openCreateModal} icon={Plus}>Add parent</Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={parents}
        loading={loading}
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search name, username, email or phone…"
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={search ? "No parents match your search" : "No parents yet"}
        emptyIcon={Contact}
      />

      <Modal isOpen={createModalOpen} onClose={closeCreateModal} title="Add parent" size="lg">
        <form onSubmit={handleCreateParent}>
          <FormRow>
            <Input label="First name" name="firstName" register={createForm.register} required />
            <Input label="Middle name" name="middleName" register={createForm.register} />
            <Input label="Last name" name="lastName" register={createForm.register} required />
          </FormRow>
          <FormRow>
            <Input label="Username" name="username" register={createForm.register} autoCapitalize="none" spellCheck={false} hint={"Leave empty for \"p.\" + the child's admission number."} />
            <Input type="email" label="Email (optional)" name="email" register={createForm.register} />
          </FormRow>
          <FormRow>
            <Input type="tel" label="Phone" name="phone" register={createForm.register} />
          </FormRow>
          <FormRow>
            <Input type="password" label="Password" name="password" register={createForm.register} required minLength={8} hint="At least 8 characters." />
            <Select label="Relationship" name="relationship" register={createForm.register} options={relationshipOptions} placeholder={null} />
          </FormRow>
          <FormRow>
            <Input label="Occupation" name="occupation" register={createForm.register} />
            <Input label="Workplace" name="workplace" register={createForm.register} />
          </FormRow>
          <Textarea label="Address" name="address" register={createForm.register} rows={2} />
          <StudentPicker
            register={createForm.register}
            options={studentOptions}
            search={studentSearch}
            onSearch={setStudentSearch}
            label="Child"
            required
          />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeCreateModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add parent</Button>
          </DialogActions>
        </form>
      </Modal>

      <Modal
        isOpen={linkModalOpen}
        onClose={closeLinkModal}
        title="Link a student"
        description={selectedParent ? `to ${name(selectedParent)}` : undefined}
        size="md"
      >
        <form onSubmit={handleLinkStudent}>
          <StudentPicker register={linkForm.register} options={studentOptions} search={studentSearch} onSearch={setStudentSearch} required />
          <Select label="Relationship" name="relationship" register={linkForm.register} options={relationshipOptions} placeholder={null} />
          <Checkbox id="isPrimary" label="Primary guardian" description="The main contact for this student." {...linkForm.register("isPrimary")} />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeLinkModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Link2}>Link student</Button>
          </DialogActions>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(passwordParent)}
        onClose={() => {
          setPasswordParent(null);
          setNewPassword("");
        }}
        title="Reset password"
        description={passwordParent ? name(passwordParent) : undefined}
        size="sm"
      >
        <form onSubmit={submitPasswordReset}>
          <label htmlFor="new-parent-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
          <TextInput
            id="new-parent-password"
            type="text"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <p className="mt-1.5 text-xs text-slate-500">They can change it after signing in.</p>
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPasswordParent(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={KeyRound}>Reset password</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default Parents;
