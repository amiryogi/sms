import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash2, UserCheck, Pencil, UserCog, Star } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Select, Button, FormRow } from "../../components/common/FormElements";
import {
  PageHeader,
  Badge,
  Avatar,
  IconButton,
  Checkbox,
  SelectInput,
  DialogActions,
  toast,
  confirmDialog,
} from "../../components/ui";
import { academicService } from "../../api/academicService";
import { teacherService } from "../../api/teacherService";
import { fullName } from "../../utils/format";

// The endpoint has returned both a bare array and { data: [...] } over time.
const asList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const TeacherAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [filters, setFilters] = useState({ academicYearId: "" });
  const [search, setSearch] = useState("");

  const { register, handleSubmit, reset, watch } = useForm();
  const watchedClassId = watch("classId");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.academicYearId) {
      fetchAssignments();
      fetchClassSubjectsForYear();
    }
  }, [filters.academicYearId]);

  useEffect(() => {
    if (watchedClassId) {
      fetchSectionsForClass(watchedClassId);
    }
  }, [watchedClassId]);

  const fetchInitialData = async () => {
    try {
      const [teachersRes, classesRes, yearsRes] = await Promise.all([
        // Only teachers can be given subjects (the API refuses other staff). Every page of them.
        teacherService.getAllTeachers({ role: "TEACHER" }),
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setTeachers(teachersRes);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);

      const currentYear = yearsRes.data?.find((y) => y.isCurrent);
      if (currentYear) {
        setFilters({ academicYearId: currentYear.id.toString() });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load teachers and classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await teacherService.getTeacherAssignments({ academicYearId: filters.academicYearId });
      setAssignments(asList(response));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjectsForYear = async () => {
    try {
      const response = await academicService.getClassSubjects({ academicYearId: filters.academicYearId });
      setClassSubjects(response.data || []);
    } catch {
      setClassSubjects([]);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    try {
      const response = await academicService.getSections(classId);
      setSections(response.data || []);
    } catch {
      setSections([]);
    }
  };

  const openModal = (assignment = null) => {
    setEditingAssignment(assignment);
    reset(
      assignment
        ? {
            userId: assignment.userId?.toString() || assignment.user?.id?.toString() || "",
            classId: assignment.classSubject?.class?.id?.toString() || "",
            sectionId: assignment.sectionId?.toString() || "",
            classSubjectId: assignment.classSubjectId?.toString() || "",
            isClassTeacher: assignment.isClassTeacher || false,
          }
        : { userId: "", classId: "", sectionId: "", classSubjectId: "", isClassTeacher: false },
    );
    setModalOpen(true);
    // Staff added since the page opened (e.g. in another tab) appear without a reload.
    teacherService
      .getAllTeachers({ role: "TEACHER" })
      .then(setTeachers)
      .catch(() => {});
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAssignment(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        userId: parseInt(data.userId),
        classSubjectId: parseInt(data.classSubjectId),
        sectionId: parseInt(data.sectionId),
        isClassTeacher: data.isClassTeacher === true || data.isClassTeacher === "true",
      };

      if (editingAssignment) {
        const assignmentId = editingAssignment.id || editingAssignment.Id;
        if (!assignmentId) {
          toast.error("This assignment has no id. Refresh the page and try again.");
          return;
        }
        await teacherService.updateAssignment(assignmentId, payload);
        toast.success("Assignment updated");
      } else {
        await teacherService.assignTeacher(payload);
        toast.success("Teacher assigned");
      }
      fetchAssignments();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDialog({
      title: "Remove this assignment?",
      message: `${fullName(row.user)} will no longer teach ${row.classSubject?.subject?.name || "this subject"} to ${row.classSubject?.class?.name || ""} ${row.section?.name || ""}.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await teacherService.removeAssignment(row.id);
      toast.success("Assignment removed");
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove the assignment");
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) =>
      `${fullName(a.user)} ${a.classSubject?.class?.name} ${a.section?.name} ${a.classSubject?.subject?.name}`
        .toLowerCase()
        .includes(q),
    );
  }, [assignments, search]);

  const columns = [
    {
      header: "Teacher",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.user?.avatarUrl} name={fullName(row.user)} size="sm" />
          <span className="font-medium text-slate-900">{fullName(row.user) || "—"}</span>
        </div>
      ),
    },
    {
      header: "Class",
      render: (row) => (
        <span>
          {row.classSubject?.class?.name || "—"}
          <span className="text-slate-400"> · </span>
          {row.section?.name || "—"}
        </span>
      ),
    },
    { header: "Subject", render: (row) => row.classSubject?.subject?.name || "—" },
    {
      header: "Role",
      render: (row) =>
        row.isClassTeacher ? (
          <Badge tone="brand" icon={Star}>Class teacher</Badge>
        ) : (
          <span className="text-sm text-slate-500">Subject teacher</span>
        ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "96px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label="Edit assignment" onClick={() => openModal(row)} />
          <IconButton icon={Trash2} label="Remove assignment" variant="danger-soft" onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ];

  const yearOptions = academicYears.map((y) => ({ value: y.id.toString(), label: y.name }));
  const teacherOptions = teachers.map((t) => ({
    value: t.userId?.toString() || t.id?.toString(),
    label: fullName(t),
  }));
  const classOptions = classes.map((c) => ({ value: c.id.toString(), label: c.name }));
  const sectionOptions = sections.map((s) => ({ value: s.id.toString(), label: s.name }));
  const classSubjectOptions = classSubjects
    .filter((cs) => !watchedClassId || cs.classId?.toString() === watchedClassId)
    .map((cs) => ({ value: cs.id.toString(), label: cs.subject?.name || "Subject" }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={UserCog}
        title="Teacher Assignment"
        description="Who teaches which subject to which section. Teachers only see the classes they are assigned here."
        actions={<Button icon={Plus} onClick={() => openModal(null)}>Assign teacher</Button>}
      />

      <DataTable
        columns={columns}
        data={visible}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search teacher, class or subject…"
        toolbar={
          <div className="w-full sm:w-44">
            <SelectInput
              aria-label="Academic year"
              value={filters.academicYearId}
              onChange={(e) => setFilters({ academicYearId: e.target.value })}
            >
              {yearOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          </div>
        }
        emptyMessage={search ? "No assignments match your search" : "No teacher assignments yet"}
        emptyDescription={search ? undefined : "Assign a teacher to a class, section and subject to get started."}
        emptyIcon={UserCog}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingAssignment ? "Edit assignment" : "Assign teacher"} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select label="Teacher" name="userId" options={teacherOptions} register={register} required />
          <FormRow>
            <Select label="Class" name="classId" options={classOptions} register={register} required />
            <Select label="Section" name="sectionId" options={sectionOptions} register={register} required />
          </FormRow>
          <Select
            label="Subject"
            name="classSubjectId"
            options={classSubjectOptions}
            register={register}
            required
            placeholder={watchedClassId ? "Select subject…" : "Select a class first…"}
          />
          <Checkbox
            id="isClassTeacher"
            label="Class teacher for this section"
            description="Shown as the class teacher on report cards."
            {...register("isClassTeacher")}
          />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={UserCheck}>
              {editingAssignment ? "Save changes" : "Assign"}
            </Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherAssignment;
