import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Eye, UserPlus, GraduationCap } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button, FormRow } from "../../components/common/FormElements";
import { PageHeader, Badge, Avatar, IconButton, DialogActions, toast } from "../../components/ui";
import { studentService } from "../../api/studentService";
import { academicService } from "../../api/academicService";
import AvatarUpload from "../../components/common/AvatarUpload";
import { toDateInput, fullName } from "../../utils/format";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const FormSection = ({ title, children }) => (
  <section className="mb-2">
    <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
    {children}
  </section>
);

/**
 * Admin student management. With `readOnly` (exam officers and accountants,
 * route /staff/students) it is a directory: no add, edit or enroll, and the
 * details form opens with every field disabled. The backend enforces the same.
 */
const Students = ({ readOnly = false }) => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const enrollForm = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, search]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([academicService.getClasses(), academicService.getAcademicYears()]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);
    } catch {
      // Filters stay empty; the list itself still loads.
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({ page: pagination.page, limit: pagination.limit, search });
      setStudents(response.data?.students || response.data || []);
      // The API returns { data: [...], pagination } at the top level.
      const pager = response.pagination || response.data?.pagination;
      if (pager) setPagination((prev) => ({ ...prev, ...pager }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load students");
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const response = await academicService.getSections(classId);
      setSections(response.data || []);
    } catch {
      setSections([]);
    }
  };

  const openModal = async (student = null) => {
    setEditingStudent(student);
    if (student) {
      try {
        const { data: s } = await studentService.getStudentById(student.id);
        reset({
          firstName: s.firstName || s.user?.firstName,
          middleName: s.middleName || s.user?.middleName || "",
          lastName: s.lastName || s.user?.lastName,
          email: s.email || s.user?.email,
          phone: s.phone || s.user?.phone || "",
          admissionNumber: s.admissionNumber,
          dateOfBirth: toDateInput(s.dateOfBirth),
          gender: s.gender,
          bloodGroup: s.bloodGroup || "",
          address: s.address || "",
          emergencyContact: s.emergencyContact || "",
        });
        setAvatarUrl(s.avatarUrl || s.user?.avatarUrl || "");
      } catch {
        reset({
          firstName: student.firstName,
          middleName: student.middleName || "",
          lastName: student.lastName,
          email: student.email,
          phone: student.phone || "",
          admissionNumber: student.admissionNumber,
          dateOfBirth: toDateInput(student.dateOfBirth),
          gender: student.gender,
          bloodGroup: student.bloodGroup || "",
          address: student.address || "",
          emergencyContact: student.emergencyContact || "",
        });
        setAvatarUrl(student.avatarUrl || "");
      }
    } else {
      reset({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        admissionNumber: "",
        rollNumber: "",
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        address: "",
        emergencyContact: "",
        admissionDate: toDateInput(new Date()),
        academicYearId: academicYears.find((y) => y.isCurrent)?.id?.toString() || "",
        classId: "",
        sectionId: "",
      });
      setAvatarUrl("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
    setAvatarUrl("");
    reset();
  };

  const openEnrollModal = (student) => {
    setSelectedStudent(student);
    enrollForm.reset({ academicYearId: academicYears.find((y) => y.isCurrent)?.id?.toString() || "" });
    setEnrollModalOpen(true);
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setSelectedStudent(null);
    enrollForm.reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payloadBase = { ...data, avatarUrl: avatarUrl || undefined };
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, payloadBase);
        toast.success("Student updated");
      } else {
        await studentService.createStudent({
          ...payloadBase,
          academicYearId: parseInt(data.academicYearId),
          classId: parseInt(data.classId),
          sectionId: parseInt(data.sectionId),
          rollNumber: data.rollNumber ? parseInt(data.rollNumber) : undefined,
        });
        toast.success("Student added and enrolled");
      }
      fetchStudents();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the student");
    } finally {
      setSubmitting(false);
    }
  };

  const onEnrollSubmit = async (data) => {
    setSubmitting(true);
    try {
      await studentService.enrollStudent(selectedStudent.id, {
        academicYearId: parseInt(data.academicYearId),
        classId: parseInt(data.classId),
        sectionId: parseInt(data.sectionId),
        rollNumber: data.rollNumber,
      });
      toast.success(`${selectedStudent.firstName} enrolled`);
      fetchStudents();
      closeEnrollModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not enrol the student");
    } finally {
      setSubmitting(false);
    }
  };

  const name = (row) => fullName(row);

  const columns = [
    {
      header: "Student",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={row.avatarUrl} name={name(row)} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{name(row)}</p>
            <p className="truncate text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Admission no.",
      render: (row) => <span className="font-mono text-xs text-slate-700">{row.admissionNumber}</span>,
    },
    {
      header: "Class",
      render: (row) =>
        row.class && row.section ? (
          <span>
            {row.class}
            <span className="text-slate-400"> · </span>
            {row.section}
          </span>
        ) : (
          <Badge tone="warning">Not enrolled</Badge>
        ),
    },
    { header: "Roll", render: (row) => <span className="tabular-nums">{row.rollNumber || "—"}</span> },
    {
      header: "Gender",
      render: (row) => <span className="capitalize">{row.gender || "—"}</span>,
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: readOnly ? "56px" : "96px",
      render: (row) =>
        readOnly ? (
          <div className="flex justify-end">
            <IconButton icon={Eye} label={`View ${name(row)}`} onClick={() => openModal(row)} />
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <IconButton icon={Pencil} label={`Edit ${name(row)}`} onClick={() => openModal(row)} />
            <IconButton icon={UserPlus} label={`Enrol ${name(row)}`} onClick={() => openEnrollModal(row)} />
          </div>
        ),
    },
  ];

  const yearOptions = academicYears.map((y) => ({ value: y.id.toString(), label: y.name }));
  const classOptions = classes.map((c) => ({ value: c.id.toString(), label: c.name }));
  const sectionOptions = sections.map((s) => ({ value: s.id.toString(), label: s.name }));

  const studentTitle = readOnly ? "Student details" : editingStudent ? "Edit student" : "Add student";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={GraduationCap}
        title="Students"
        description={readOnly ? "Student directory (view only)." : "Student records, enrolment and contact details."}
        actions={readOnly ? null : <Button icon={Plus} onClick={() => openModal()}>Add student</Button>}
      />

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search name, email or admission no…"
        emptyMessage={search ? "No students match your search" : "No students yet"}
        emptyDescription={search || readOnly ? undefined : "Add a student to create their login and enrol them in a class."}
        emptyIcon={GraduationCap}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={studentTitle}
        description={editingStudent ? name(editingStudent) : undefined}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={readOnly} className="min-w-0 space-y-4">
            <AvatarUpload
              url={avatarUrl}
              name={editingStudent ? name(editingStudent) : ""}
              onChange={setAvatarUrl}
              disabled={readOnly}
            />

            <FormSection title="Personal details">
              <FormRow>
                <Input label="First name" name="firstName" register={register} error={errors.firstName?.message} required />
                <Input label="Middle name" name="middleName" register={register} error={errors.middleName?.message} />
                <Input label="Last name" name="lastName" register={register} error={errors.lastName?.message} required />
              </FormRow>
              <FormRow>
                <Input label="Date of birth" name="dateOfBirth" type="date" register={register} required />
                <Select label="Gender" name="gender" options={GENDERS} register={register} required />
                <Input label="Blood group" name="bloodGroup" register={register} placeholder="e.g. A+" />
              </FormRow>
            </FormSection>

            <FormSection title="Contact & login">
              <FormRow>
                <Input label="Email" name="email" type="email" register={register} required />
                <Input label="Phone" name="phone" register={register} />
              </FormRow>
              {!editingStudent && (
                <Input label="Password" name="password" type="password" register={register} required hint="The student signs in with this email and password." />
              )}
              <FormRow>
                <Input label="Emergency contact" name="emergencyContact" register={register} />
                <Input label="Address" name="address" register={register} />
              </FormRow>
            </FormSection>

            <FormSection title="School">
              <FormRow>
                <Input label="Admission number" name="admissionNumber" register={register} required />
                {!editingStudent && <Input label="Roll number" name="rollNumber" register={register} />}
                {!editingStudent && <Input label="Admission date" name="admissionDate" type="date" register={register} required />}
              </FormRow>
              {!editingStudent && (
                <FormRow>
                  <Select label="Academic year" name="academicYearId" options={yearOptions} register={register} required />
                  <Select
                    label="Class"
                    name="classId"
                    options={classOptions}
                    register={register}
                    required
                    onChange={(e) => handleClassChange(e.target.value)}
                  />
                  <Select label="Section" name="sectionId" options={sectionOptions} register={register} required />
                </FormRow>
              )}
            </FormSection>
          </fieldset>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>{readOnly ? "Close" : "Cancel"}</Button>
            {!readOnly && (
              <Button type="submit" loading={submitting}>{editingStudent ? "Save changes" : "Add student"}</Button>
            )}
          </DialogActions>
        </form>
      </Modal>

      <Modal isOpen={enrollModalOpen} onClose={closeEnrollModal} title="Enrol student" size="md">
        <form onSubmit={enrollForm.handleSubmit(onEnrollSubmit)}>
          {selectedStudent && (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <Avatar src={selectedStudent.avatarUrl} name={name(selectedStudent)} />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">{name(selectedStudent)}</p>
                <p className="text-slate-500">
                  {selectedStudent.admissionNumber} ·{" "}
                  {selectedStudent.class ? `${selectedStudent.class} ${selectedStudent.section}` : "Not enrolled"}
                </p>
              </div>
            </div>
          )}
          <Select label="Academic year" name="academicYearId" options={yearOptions} register={enrollForm.register} required />
          <FormRow>
            <Select
              label="Class"
              name="classId"
              options={classOptions}
              register={enrollForm.register}
              required
              onChange={(e) => handleClassChange(e.target.value)}
            />
            <Select label="Section" name="sectionId" options={sectionOptions} register={enrollForm.register} required />
          </FormRow>
          <Input label="Roll number" name="rollNumber" register={enrollForm.register} />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeEnrollModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={UserPlus}>Enrol</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
