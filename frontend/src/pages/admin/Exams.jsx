import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Plus, Eye, Trash2, Pencil, Lock, Unlock, Send, ClipboardList, Check, FlaskConical } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button, FormRow } from "../../components/common/FormElements";
import { PageHeader, Badge, IconButton, Tabs, Alert, DialogActions, toast, confirmDialog } from "../../components/ui";
import { cn } from "../../lib/cn";
import { examService } from "../../api/examService";
import { academicService } from "../../api/academicService";
import { formatDate, toDateInput } from "../../utils/format";

const STATUS = {
  DRAFT: { tone: "warning", label: "Draft", hint: "Being set up. Teachers can't see it yet." },
  PUBLISHED: { tone: "success", label: "Published", hint: "Teachers are entering marks." },
  LOCKED: { tone: "neutral", label: "Locked", hint: "Marks are frozen; report cards can be generated." },
};

const EXAM_TYPES = [
  { value: "unit_test", label: "Unit test" },
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final" },
  { value: "board", label: "Board" },
];
const typeLabel = (t) => EXAM_TYPES.find((x) => x.value === t)?.label || t;

/** Class picker for a new exam: every class's subjects are linked automatically. */
const ClassPicker = ({ classes, control, name }) => (
  <Controller
    name={name}
    control={control}
    defaultValue={[]}
    render={({ field: { onChange, value } }) => (
      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="text-sm font-medium text-slate-700">Classes sitting this exam</legend>
          <button
            type="button"
            className="cursor-pointer text-xs font-medium text-brand-700 hover:underline"
            onClick={() => onChange(value.length === classes.length ? [] : classes.map((c) => c.id.toString()))}
          >
            {value.length === classes.length ? "Clear all" : "Select all"}
          </button>
        </div>
        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4">
          {classes.map((cls) => {
            const id = cls.id.toString();
            const checked = value.includes(id);
            return (
              <label
                key={cls.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  checked ? "border-brand-400 bg-brand-50 text-brand-800" : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked ? [...value, id] : value.filter((v) => v !== id))}
                />
                {cls.name}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Each class's subjects, full marks and pass marks are copied into the exam.</p>
      </fieldset>
    )}
  />
);

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]); // class subjects of the viewed exam's year
  const [loading, setLoading] = useState(true);
  const [viewingExam, setViewingExam] = useState(null);
  const [addingSubjects, setAddingSubjects] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, yearsRes, classesRes] = await Promise.all([
        examService.getExams(),
        academicService.getAcademicYears(),
        academicService.getClasses(),
      ]);
      setExams(examsRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load exams");
    } finally {
      setLoading(false);
    }
  };

  const refreshViewing = async (id) => {
    const response = await examService.getExam(id);
    setViewingExam(response.data);
  };

  const openModal = (exam = null) => {
    setEditingExam(exam);
    reset(
      exam
        ? {
            name: exam.name,
            examType: exam.examType,
            startDate: toDateInput(exam.startDate),
            endDate: toDateInput(exam.endDate),
            academicYearId: exam.academicYearId?.toString(),
            classIds: [],
          }
        : {
            name: "",
            examType: "unit_test",
            startDate: "",
            endDate: "",
            academicYearId: academicYears.find((y) => y.isCurrent)?.id?.toString() || "",
            classIds: [],
          },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExam(null);
    reset();
  };

  const openViewModal = async (examId) => {
    try {
      const response = await examService.getExam(examId);
      setViewingExam(response.data);
      if (response.data.academicYearId) {
        const csRes = await academicService.getClassSubjects({ academicYearId: response.data.academicYearId });
        setClassSubjects(csRes.data || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the exam");
    }
  };

  const closeViewModal = () => {
    setViewingExam(null);
    setClassSubjects([]);
  };

  // Add every not-yet-linked subject of a class to the viewed (DRAFT) exam.
  const handleAddClassToExam = async (cls) => {
    if (!viewingExam) return;
    const linked = new Set(viewingExam.examSubjects?.map((es) => es.classSubjectId) || []);
    const subjectsToAdd = classSubjects.filter((cs) => cs.classId === cls.id && !linked.has(cs.id));
    if (!subjectsToAdd.length) return toast.info(`All ${cls.name} subjects are already in this exam.`);

    setAddingSubjects(true);
    try {
      await examService.updateExamSubjects(
        viewingExam.id,
        subjectsToAdd.map((cs) => ({
          classSubjectId: cs.id,
          theoryFullMarks: cs.theoryMarks,
          practicalFullMarks: cs.practicalMarks,
          fullMarks: cs.fullMarks,
          passMarks: cs.passMarks,
        })),
      );
      toast.success(`Added ${subjectsToAdd.length} ${cls.name} subject${subjectsToAdd.length === 1 ? "" : "s"}`);
      await refreshViewing(viewingExam.id);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add the subjects");
    } finally {
      setAddingSubjects(false);
    }
  };

  const handleRemoveExamSubject = async (es) => {
    const ok = await confirmDialog({
      title: `Remove ${es.classSubject?.subject?.name} (${es.classSubject?.class?.name})?`,
      message: "It will no longer be part of this exam.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    setAddingSubjects(true);
    try {
      await examService.removeExamSubject(viewingExam.id, es.id);
      await refreshViewing(viewingExam.id);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove the subject");
    } finally {
      setAddingSubjects(false);
    }
  };

  // Lifecycle transitions: DRAFT -> PUBLISHED -> LOCKED (unlock goes back to PUBLISHED).
  const transition = async (exam, action) => {
    const config = {
      publish: {
        title: `Publish ${exam.name}?`,
        message: "Teachers will see it and can start entering marks. Subjects can no longer be added or removed.",
        confirmLabel: "Publish",
        run: () => examService.publishExam(exam.id),
        done: "Exam published. Teachers can now enter marks.",
      },
      lock: {
        title: `Lock ${exam.name}?`,
        message: "Marks are frozen for every subject. Lock once marks entry is complete, before generating report cards.",
        confirmLabel: "Lock exam",
        tone: "danger",
        run: () => examService.lockExam(exam.id),
        done: "Exam locked. Marks are frozen.",
      },
      unlock: {
        title: `Unlock ${exam.name}?`,
        message: "Marks become editable again. Generated report cards are not changed until you regenerate them.",
        confirmLabel: "Unlock",
        run: () => examService.unlockExam(exam.id),
        done: "Exam unlocked. Marks entry is open again.",
      },
    }[action];

    const ok = await confirmDialog({ title: config.title, message: config.message, confirmLabel: config.confirmLabel, tone: config.tone });
    if (!ok) return;
    try {
      await config.run();
      toast.success(config.done);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not change the exam status");
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingExam) {
        await examService.updateExam(editingExam.id, data);
        toast.success("Exam updated");
      } else {
        await examService.createExam(data);
        toast.success("Exam created with the selected classes' subjects");
      }
      fetchData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exam) => {
    const ok = await confirmDialog({
      title: `Delete ${exam.name}?`,
      message: "This cannot be undone. Only draft exams can be deleted.",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await examService.deleteExam(exam.id);
      toast.success("Exam deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the exam");
    }
  };

  const counts = useMemo(
    () => exams.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {}),
    [exams],
  );
  const visible = statusFilter ? exams.filter((e) => e.status === statusFilter) : exams;

  const columns = [
    {
      header: "Exam",
      render: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => openViewModal(row.id)}
            className="cursor-pointer truncate text-left font-medium text-slate-900 hover:text-brand-700 hover:underline"
          >
            {row.name}
          </button>
          <p className="text-xs text-slate-500">
            {typeLabel(row.examType)} · {row.academicYear?.name || "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Dates",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-600">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      header: "Subjects",
      render: (row) => (
        <button
          type="button"
          onClick={() => openViewModal(row.id)}
          className="cursor-pointer text-sm font-medium text-brand-700 hover:underline"
        >
          {row._count?.examSubjects || 0} linked
        </button>
      ),
    },
    {
      header: "Status",
      render: (row) => {
        const s = STATUS[row.status] || STATUS.DRAFT;
        return (
          <Badge tone={s.tone} dot className="cursor-help" >
            <span title={s.hint}>{s.label}</span>
          </Badge>
        );
      },
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "260px",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "DRAFT" && (
            <Button size="sm" variant="outline" icon={Send} onClick={() => transition(row, "publish")}>Publish</Button>
          )}
          {row.status === "PUBLISHED" && (
            <Button size="sm" variant="outline" icon={Lock} onClick={() => transition(row, "lock")}>Lock</Button>
          )}
          {row.status === "LOCKED" && (
            <Button size="sm" variant="ghost" icon={Unlock} onClick={() => transition(row, "unlock")}>Unlock</Button>
          )}
          <IconButton icon={Eye} label="View subjects" onClick={() => openViewModal(row.id)} />
          {row.status === "DRAFT" && (
            <>
              <IconButton icon={Pencil} label="Edit exam" onClick={() => openModal(row)} />
              <IconButton icon={Trash2} label="Delete exam" variant="danger-soft" onClick={() => handleDelete(row)} />
            </>
          )}
        </div>
      ),
    },
  ];

  const academicYearOptions = academicYears.map((y) => ({
    value: y.id.toString(),
    label: `${y.name}${y.isCurrent ? " (current)" : ""}`,
  }));

  // Classes with subjects in the viewed exam's year, with how many are linked.
  const classProgress = useMemo(() => {
    if (!viewingExam) return [];
    const linkedByClass = {};
    (viewingExam.examSubjects || []).forEach((es) => {
      const id = es.classSubject?.class?.id;
      linkedByClass[id] = (linkedByClass[id] || 0) + 1;
    });
    const byClass = {};
    classSubjects.forEach((cs) => {
      byClass[cs.classId] ??= { id: cs.classId, name: cs.class?.name || `Class ${cs.classId}`, total: 0 };
      byClass[cs.classId].total += 1;
    });
    return Object.values(byClass)
      .map((c) => ({ ...c, linked: linkedByClass[c.id] || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [viewingExam, classSubjects]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        icon={ClipboardList}
        title="Exams"
        description="Create an exam, publish it for marks entry, then lock it before generating report cards."
        actions={<Button icon={Plus} onClick={() => openModal()}>Create exam</Button>}
        className="mb-2"
      />

      <Tabs
        value={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { value: "", label: "All", count: exams.length },
          { value: "DRAFT", label: "Draft", count: counts.DRAFT || 0 },
          { value: "PUBLISHED", label: "Published", count: counts.PUBLISHED || 0 },
          { value: "LOCKED", label: "Locked", count: counts.LOCKED || 0 },
        ]}
      />

      <DataTable
        columns={columns}
        data={visible}
        loading={loading}
        emptyMessage={statusFilter ? "No exams with this status" : "No exams yet"}
        emptyDescription={statusFilter ? undefined : "Create the first exam of the year and pick the classes sitting it."}
        emptyIcon={ClipboardList}
      />

      {/* Create / edit */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingExam ? "Edit exam" : "Create exam"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input label="Exam name" name="name" placeholder="e.g. First Term Examination" register={register} error={errors.name?.message} required />
            <Select label="Type" name="examType" options={EXAM_TYPES} register={register} error={errors.examType?.message} required placeholder={null} />
          </FormRow>
          <FormRow>
            <Select label="Academic year" name="academicYearId" options={academicYearOptions} register={register} error={errors.academicYearId?.message} required />
            <Input label="Starts" name="startDate" type="date" register={register} error={errors.startDate?.message} required />
            <Input label="Ends" name="endDate" type="date" register={register} error={errors.endDate?.message} required />
          </FormRow>
          {!editingExam && <ClassPicker classes={classes} control={control} name="classIds" />}
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingExam ? "Save changes" : "Create exam"}</Button>
          </DialogActions>
        </form>
      </Modal>

      {/* Details: linked subjects */}
      <Modal
        isOpen={!!viewingExam}
        onClose={closeViewModal}
        title={viewingExam?.name || "Exam"}
        description={viewingExam ? `${typeLabel(viewingExam.examType)} · ${formatDate(viewingExam.startDate)} – ${formatDate(viewingExam.endDate)}` : undefined}
        size="xl"
      >
        {viewingExam && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={(STATUS[viewingExam.status] || STATUS.DRAFT).tone} dot>
                {(STATUS[viewingExam.status] || STATUS.DRAFT).label}
              </Badge>
              <span className="text-sm text-slate-500">{(STATUS[viewingExam.status] || STATUS.DRAFT).hint}</span>
            </div>

            {viewingExam.status === "DRAFT" ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-800">Add a class</p>
                <p className="mb-3 text-xs text-slate-500">Adds all of the class's subjects with their theory and practical marks.</p>
                <div className="flex flex-wrap gap-2">
                  {classProgress.map((c) => {
                    const complete = c.linked >= c.total;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddClassToExam(c)}
                        disabled={addingSubjects || complete}
                        title={complete ? "All subjects already added" : `Add ${c.total - c.linked} subject(s)`}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition-colors ring-inset disabled:cursor-not-allowed",
                          complete ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-white text-slate-700 ring-slate-300 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300",
                        )}
                      >
                        {complete ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                        {c.name}
                        {c.linked > 0 && !complete && <span className="text-xs text-slate-400">{c.linked}/{c.total}</span>}
                      </button>
                    );
                  })}
                  {!classProgress.length && <p className="text-sm text-slate-500">No class subjects are set up for this year.</p>}
                </div>
              </div>
            ) : (
              <Alert tone="info">Subjects can only be changed while the exam is a draft.</Alert>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">Linked subjects ({viewingExam.examSubjects?.length || 0})</p>
              {viewingExam.examSubjects?.length ? (
                <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Class</th>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-4 py-2.5">Evaluation</th>
                        <th className="px-4 py-2.5 text-right">Full</th>
                        <th className="px-4 py-2.5 text-right">Pass</th>
                        {viewingExam.status === "DRAFT" && <th className="px-4 py-2.5"><span className="sr-only">Remove</span></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingExam.examSubjects.map((es) => (
                        <tr key={es.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 whitespace-nowrap">{es.classSubject?.class?.name || "—"}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{es.classSubject?.subject?.name || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {es.hasTheory !== false && <Badge tone="info">Theory {es.theoryFullMarks || 0}</Badge>}
                              {es.hasPractical === true && <Badge tone="success" icon={FlaskConical}>Practical {es.practicalFullMarks || 0}</Badge>}
                              {es.hasTheory === false && es.hasPractical !== true && <Badge tone="warning">Not configured</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{es.fullMarks}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{es.passMarks}</td>
                          {viewingExam.status === "DRAFT" && (
                            <td className="px-2 py-1.5 text-right">
                              <IconButton
                                icon={Trash2}
                                size="sm"
                                variant="danger-soft"
                                label={`Remove ${es.classSubject?.subject?.name}`}
                                onClick={() => handleRemoveExamSubject(es)}
                                disabled={addingSubjects}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">No subjects linked yet.</p>
              )}
            </div>
          </div>
        )}
        <DialogActions>
          <Button variant="secondary" onClick={closeViewModal}>Close</Button>
        </DialogActions>
      </Modal>
    </div>
  );
};

export default Exams;
