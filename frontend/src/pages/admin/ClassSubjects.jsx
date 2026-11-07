import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash2, Link as LinkIcon, Pencil, Lock, BookOpenCheck } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Select, Button, Input, FormRow } from "../../components/common/FormElements";
import {
  PageHeader,
  Badge,
  IconButton,
  Checkbox,
  SelectInput,
  DialogActions,
  toast,
  confirmDialog,
} from "../../components/ui";
import { academicService } from "../../api/academicService";

const ClassSubjects = () => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // the row being edited, or null
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ academicYearId: "", classId: "" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.academicYearId || filters.classId) {
      fetchClassSubjects();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, subjectsRes, yearsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getAcademicYears(),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAcademicYears(yearsRes.data || []);

      // Default to the current year
      const currentYear = yearsRes.data?.find((y) => y.isCurrent);
      if (currentYear) {
        setFilters((prev) => ({ ...prev, academicYearId: currentYear.id.toString() }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load classes and subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.academicYearId) params.academicYearId = filters.academicYearId;
      if (filters.classId) params.classId = filters.classId;
      const response = await academicService.getClassSubjects(params);
      setClassSubjects(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load class subjects");
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setEditing(null);
    reset({
      academicYearId: filters.academicYearId,
      classId: filters.classId,
      subjectId: "",
      hasTheory: true,
      hasPractical: false,
      theoryMarks: 100,
      practicalMarks: 0,
      creditHours: 3.0,
      theoryCreditHours: 0,
      practicalCreditHours: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row);
    reset({
      academicYearId: row.academicYearId?.toString(),
      classId: row.classId?.toString(),
      subjectId: row.subjectId?.toString(),
      hasTheory: row.hasTheory !== false,
      hasPractical: row.hasPractical === true,
      theoryMarks: row.theoryMarks,
      practicalMarks: row.practicalMarks,
      creditHours: row.creditHours,
      theoryCreditHours: row.theoryCreditHours || 0,
      practicalCreditHours: row.practicalCreditHours || 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    reset();
  };

  const onSubmit = async (data) => {
    const theory = parseInt(data.theoryMarks || 100);
    const practical = parseInt(data.practicalMarks || 0);
    const credits = parseFloat(data.creditHours || 3.0);

    if (Number.isNaN(theory) || theory < 0) return toast.error("Theory marks must be zero or greater.");
    if (Number.isNaN(practical) || practical < 0) return toast.error("Practical marks must be zero or greater.");
    if (Number.isNaN(credits) || credits <= 0) return toast.error("Credit hours must be greater than zero.");

    setSubmitting(true);
    try {
      const payload = {
        academicYearId: editing ? editing.academicYearId : parseInt(data.academicYearId),
        classId: editing ? editing.classId : parseInt(data.classId),
        subjectId: editing ? editing.subjectId : parseInt(data.subjectId),
        hasTheory: data.hasTheory === true || data.hasTheory === "true",
        hasPractical: data.hasPractical === true || data.hasPractical === "true",
        theoryMarks: theory,
        practicalMarks: practical,
        creditHours: credits,
        theoryCreditHours: parseFloat(data.theoryCreditHours || 0),
        practicalCreditHours: parseFloat(data.practicalCreditHours || 0),
      };

      if (editing) {
        await academicService.updateClassSubject(editing.id, payload);
        toast.success("Class subject updated");
      } else {
        await academicService.assignSubjectToClass(payload);
        toast.success("Subject added to the class");
      }
      fetchClassSubjects();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the class subject");
    } finally {
      setSubmitting(false);
    }
  };

  const getClassName = (classId) => classes.find((c) => c.id === classId)?.name || "Unknown";
  const getSubjectName = (subjectId) => subjects.find((s) => s.id === subjectId)?.name || "Unknown";
  const getYearName = (yearId) => academicYears.find((y) => y.id === yearId)?.name || "Unknown";

  const handleDelete = async (row) => {
    const ok = await confirmDialog({
      title: `Remove ${getSubjectName(row.subjectId)} from ${getClassName(row.classId)}?`,
      message: "Teachers assigned to it lose the assignment. Subjects with entered marks are locked and cannot be removed.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await academicService.removeSubjectFromClass(row.id);
      toast.success("Subject removed from the class");
      fetchClassSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove the subject");
    }
  };

  const columns = [
    {
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{getSubjectName(row.subjectId)}</p>
          <p className="text-xs text-slate-500">
            {getClassName(row.classId)} · {getYearName(row.academicYearId)}
          </p>
        </div>
      ),
    },
    {
      header: "Evaluation",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.hasTheory !== false && <Badge tone="info">Theory {row.theoryMarks}</Badge>}
          {row.hasPractical === true && <Badge tone="success">Practical {row.practicalMarks}</Badge>}
          {row.hasTheory === false && row.hasPractical !== true && <Badge tone="warning">Not configured</Badge>}
        </div>
      ),
    },
    {
      header: "Credit hours",
      render: (row) => (
        <div>
          <span className="tabular-nums">{row.creditHours}</span>
          {(row.theoryCreditHours > 0 || row.practicalCreditHours > 0) && (
            <p className="text-xs text-slate-500 tabular-nums">
              TH {row.theoryCreditHours || 0} · IN {row.practicalCreditHours || 0}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) =>
        row.isLocked ? (
          <Badge tone="warning" icon={Lock}>
            Locked
          </Badge>
        ) : (
          <Badge tone="success" dot>
            Editable
          </Badge>
        ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "96px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton
            icon={Pencil}
            label={row.isLocked ? "Locked: marks have been entered" : "Edit"}
            onClick={() => openEditModal(row)}
            disabled={row.isLocked}
          />
          <IconButton
            icon={Trash2}
            label={row.isLocked ? "Locked: marks have been entered" : "Remove from class"}
            variant="danger-soft"
            onClick={() => handleDelete(row)}
            disabled={row.isLocked}
          />
        </div>
      ),
    },
  ];

  const yearOptions = academicYears.map((y) => ({ value: y.id.toString(), label: y.name }));
  const classOptions = classes.map((c) => ({ value: c.id.toString(), label: c.name }));
  const subjectOptions = subjects.map((s) => ({ value: s.id.toString(), label: s.name }));

  const toolbar = (
    <>
      <div className="w-full sm:w-44">
        <SelectInput
          aria-label="Academic year"
          value={filters.academicYearId}
          onChange={(e) => setFilters((prev) => ({ ...prev, academicYearId: e.target.value }))}
        >
          <option value="">All years</option>
          {yearOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectInput>
      </div>
      <div className="w-full sm:w-44">
        <SelectInput
          aria-label="Class"
          value={filters.classId}
          onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value }))}
        >
          <option value="">All classes</option>
          {classOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectInput>
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={BookOpenCheck}
        title="Class Subjects"
        description="Which subjects each class studies this year, with full marks and credit hours. Exams copy these settings when they are created."
        actions={<Button icon={Plus} onClick={openModal}>Add subject to class</Button>}
      />

      <DataTable
        columns={columns}
        data={classSubjects}
        loading={loading}
        toolbar={toolbar}
        emptyMessage="No subjects for this selection"
        emptyDescription="Pick a year and class, then add the subjects the class studies."
        emptyIcon={BookOpenCheck}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit class subject" : "Add subject to class"}
        description={editing ? `${getSubjectName(editing.subjectId)} · ${getClassName(editing.classId)}` : undefined}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {!editing && (
            <FormRow>
              <Select
                label="Academic year"
                name="academicYearId"
                options={yearOptions}
                register={register}
                error={errors.academicYearId?.message}
                required
              />
              <Select
                label="Class"
                name="classId"
                options={classOptions}
                register={register}
                error={errors.classId?.message}
                required
              />
              <Select
                label="Subject"
                name="subjectId"
                options={subjectOptions}
                register={register}
                error={errors.subjectId?.message}
                required
              />
            </FormRow>
          )}

          <fieldset className="mb-4 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">Evaluation</legend>
            <p className="mb-3 text-xs text-slate-500">
              Decides which mark fields teachers see in marks entry.
            </p>
            <div className="mb-4 flex flex-wrap gap-6">
              <Checkbox id="hasTheory" label="Theory" {...register("hasTheory")} />
              <Checkbox id="hasPractical" label="Practical" {...register("hasPractical")} />
            </div>
            <FormRow>
              <Input label="Theory full marks" name="theoryMarks" type="number" register={register} className="mb-0" />
              <Input label="Practical full marks" name="practicalMarks" type="number" register={register} className="mb-0" />
            </FormRow>
          </fieldset>

          <FormRow>
            <Input label="Total credit hours" name="creditHours" type="number" step="0.1" register={register} />
            <Input
              label="Theory credit hours (TH)"
              name="theoryCreditHours"
              type="number"
              step="0.01"
              register={register}
              hint="Shown on the grade sheet"
            />
            <Input
              label="Practical credit hours (IN)"
              name="practicalCreditHours"
              type="number"
              step="0.01"
              register={register}
              hint="Internal / practical"
            />
          </FormRow>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={editing ? undefined : LinkIcon}>
              {editing ? "Save changes" : "Add to class"}
            </Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default ClassSubjects;
