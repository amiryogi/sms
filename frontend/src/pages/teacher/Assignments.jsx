import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, FileText, Inbox, NotebookPen, Paperclip, Save, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Textarea, Button, FormRow, FileUpload } from "../../components/common/FormElements";
import { PageHeader, Badge, IconButton, Avatar, EmptyState, LoadingBlock, DialogActions, TextInput, TextArea, toast, confirmDialog } from "../../components/ui";
import { assignmentService } from "../../api/assignmentService";
import { teacherService } from "../../api/teacherService";
import { resolveAssetUrl } from "../../utils/assets";
import { formatDate, formatDateTime, toDateInput, fullName } from "../../utils/format";

const SUBMISSION_TONE = { submitted: "info", late: "warning", graded: "success", returned: "neutral" };

/** "Due in 3 days" / "Due today" / "Overdue" from the due date. */
const dueBadge = (dueDate) => {
  if (!dueDate) return null;
  const days = Math.round((new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return <Badge tone="neutral">Closed</Badge>;
  if (days === 0) return <Badge tone="warning" dot>Due today</Badge>;
  if (days <= 3) return <Badge tone="warning">Due in {days} day{days === 1 ? "" : "s"}</Badge>;
  return <Badge tone="info">Due in {days} days</Badge>;
};

const FileLink = ({ file }) => (
  <a
    href={resolveAssetUrl(file.fileUrl)}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
  >
    <FileText size={13} className="shrink-0" aria-hidden="true" />
    <span className="truncate">{file.fileName}</span>
  </a>
);

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [grading, setGrading] = useState(null); // { id, marks, feedback }
  const [savingGrade, setSavingGrade] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsRes, teacherRes] = await Promise.all([
        assignmentService.getAssignments(),
        teacherService.getTeacherAssignments({ userId: user?.id }),
      ]);
      setAssignments(assignmentsRes.data || []);
      setTeacherAssignments(teacherRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load assignments");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // One option per class-section-subject the teacher actually teaches, so a
  // class can't be paired with a section they don't teach.
  const teachingOptions = useMemo(
    () =>
      teacherAssignments.map((ta) => ({
        value: String(ta.id),
        label: `${ta.classSubject?.class?.name} ${ta.section?.name} · ${ta.classSubject?.subject?.name}`,
      })),
    [teacherAssignments],
  );

  const openModal = (assignment = null) => {
    setEditingAssignment(assignment);
    setFiles([]);
    reset(
      assignment
        ? {
            title: assignment.title,
            description: assignment.description || "",
            teacherSubjectId: String(assignment.teacherSubjectId ?? assignment.teacherSubject?.id ?? ""),
            dueDate: toDateInput(assignment.dueDate),
            totalMarks: assignment.totalMarks ?? "",
          }
        : { title: "", description: "", teacherSubjectId: teachingOptions.length === 1 ? teachingOptions[0].value : "", dueDate: "", totalMarks: "" },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAssignment(null);
    setFiles([]);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("dueDate", data.dueDate);
      if (data.totalMarks !== "" && data.totalMarks !== undefined) formData.append("totalMarks", data.totalMarks);
      Array.from(files).forEach((file) => formData.append("files", file));

      if (editingAssignment) {
        await assignmentService.updateAssignment(editingAssignment.id, formData);
        toast.success("Assignment updated");
      } else {
        formData.append("teacherSubjectId", data.teacherSubjectId);
        formData.append("isPublished", "true"); // there is no draft mode in the UI
        await assignmentService.createAssignment(formData);
        toast.success("Assignment set. Students can see it now.");
      }
      fetchData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDialog({ title: `Delete "${row.title}"?`, message: "Its attachments go too. This cannot be undone.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await assignmentService.deleteAssignment(row.id);
      toast.success("Assignment deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the assignment");
    }
  };

  const loadSubmissions = async (assignment) => {
    const res = await assignmentService.getSubmissionsByAssignment(assignment.id);
    setSubmissions(res.data || []);
  };

  const openSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissions([]);
    setGrading(null);
    setLoadingSubmissions(true);
    try {
      await loadSubmissions(assignment);
    } catch {
      toast.error("Could not load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const saveGrade = async () => {
    const max = selectedAssignment?.totalMarks;
    const marks = grading.marks === "" ? null : Number(grading.marks);
    if (marks === null || Number.isNaN(marks) || marks < 0 || (max && marks > max)) {
      return toast.error(max ? `Marks must be between 0 and ${max}.` : "Enter the marks.");
    }
    setSavingGrade(true);
    try {
      await assignmentService.gradeSubmission(grading.id, { marksObtained: marks, feedback: grading.feedback });
      await loadSubmissions(selectedAssignment);
      setGrading(null);
      toast.success("Grade saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the grade");
    } finally {
      setSavingGrade(false);
    }
  };

  const filtered = assignments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [a.title, a.teacherSubject?.classSubject?.class?.name, a.teacherSubject?.classSubject?.subject?.name].some((v) => v?.toLowerCase().includes(q));
  });

  const columns = [
    {
      header: "Assignment",
      render: (row) => (
        <div className="min-w-0 max-w-sm">
          <p className="truncate font-medium text-slate-900">{row.title}</p>
          <p className="truncate text-xs text-slate-500">
            {row.teacherSubject?.classSubject?.class?.name} {row.teacherSubject?.section?.name} · {row.teacherSubject?.classSubject?.subject?.name}
          </p>
        </div>
      ),
    },
    {
      header: "Due",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm whitespace-nowrap text-slate-700">{formatDate(row.dueDate)}</span>
          {dueBadge(row.dueDate)}
        </div>
      ),
    },
    { header: "Marks", render: (row) => <span className="tabular-nums">{row.totalMarks ?? "—"}</span> },
    {
      header: "Files",
      render: (row) =>
        row.assignmentFiles?.length ? (
          <span className="inline-flex items-center gap-1 text-sm text-slate-600"><Paperclip size={14} aria-hidden="true" />{row.assignmentFiles.length}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: "Submissions",
      render: (row) => (
        <Button size="sm" variant="secondary" icon={Inbox} onClick={() => openSubmissions(row)}>
          {row._count?.submissions ?? 0} received
        </Button>
      ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "100px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label={`Edit ${row.title}`} onClick={() => openModal(row)} />
          <IconButton icon={Trash2} label={`Delete ${row.title}`} variant="danger-soft" onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ];

  const sa = selectedAssignment;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={NotebookPen}
        title="Assignments"
        description="Set work for your classes, collect submissions and grade them."
        actions={
          <Button icon={Plus} onClick={() => openModal()} disabled={!loading && teachingOptions.length === 0}>
            Create Assignment
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search assignments…"
        emptyMessage={search ? "No assignments match" : "No assignments yet"}
        emptyDescription={
          search ? undefined : teachingOptions.length ? "Create one and your students will see it straight away." : "You need a class assignment from the admin before you can set work."
        }
        emptyIcon={NotebookPen}
      />

      {/* Create / edit */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingAssignment ? "Edit assignment" : "New assignment"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input label="Title" name="title" placeholder="e.g. Chapter 4 exercises" register={register} rules={{ required: "Give it a title" }} error={errors.title?.message} required />
          {editingAssignment ? (
            <div className="mb-4">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Class and subject</p>
              <p className="text-sm text-slate-900">
                {editingAssignment.teacherSubject?.classSubject?.class?.name} {editingAssignment.teacherSubject?.section?.name} ·{" "}
                {editingAssignment.teacherSubject?.classSubject?.subject?.name}
              </p>
            </div>
          ) : (
            <Select
              label="Class and subject"
              name="teacherSubjectId"
              options={teachingOptions}
              placeholder="Choose one of your classes"
              register={register}
              rules={{ required: "Choose a class" }}
              error={errors.teacherSubjectId?.message}
              required
            />
          )}
          <Textarea label="Instructions" name="description" placeholder="What students need to do" register={register} rows={4} />
          <FormRow>
            <Input label="Due date" name="dueDate" type="date" register={register} rules={{ required: "Set a due date" }} error={errors.dueDate?.message} required />
            <Input label="Total marks" name="totalMarks" type="number" min="0" register={register} hint="Optional" />
          </FormRow>
          <FileUpload
            label={editingAssignment ? "Add attachments" : "Attachments"}
            multiple
            files={files}
            onChange={setFiles}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
            hint="PDF, Word, PowerPoint or images. Up to 5 files."
          />
          {editingAssignment?.assignmentFiles?.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Already attached</p>
              <div className="flex flex-wrap gap-1.5">
                {editingAssignment.assignmentFiles.map((f) => <FileLink key={f.id ?? f.fileUrl} file={f} />)}
              </div>
            </div>
          )}
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingAssignment ? "Save changes" : "Create Assignment"}</Button>
          </DialogActions>
        </form>
      </Modal>

      {/* Submissions */}
      <Modal isOpen={Boolean(sa)} onClose={() => setSelectedAssignment(null)} title={sa ? `Submissions · ${sa.title}` : "Submissions"} size="xl">
        {sa && (
          <p className="-mt-1 mb-4 text-sm text-slate-500">
            {sa.teacherSubject?.classSubject?.class?.name} {sa.teacherSubject?.section?.name} · due {formatDate(sa.dueDate)}
            {sa.totalMarks ? ` · out of ${sa.totalMarks}` : ""}
          </p>
        )}
        {loadingSubmissions ? (
          <LoadingBlock text="Loading submissions…" />
        ) : submissions.length === 0 ? (
          <EmptyState icon={Inbox} title="No submissions yet" description="Work handed in by students shows up here." />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {submissions.map((sub) => {
              const u = sub.student?.user || {};
              const name = fullName(u);
              const isGrading = grading?.id === sub.id;
              const graded = sub.marksObtained !== null && sub.marksObtained !== undefined;
              return (
                <li key={sub.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar src={u.avatarUrl} name={name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(sub.submittedAt)}</p>
                    </div>
                    <Badge tone={SUBMISSION_TONE[sub.status] || "neutral"} className="capitalize">{sub.status}</Badge>
                    <span className="w-20 text-right text-sm font-semibold text-slate-900 tabular-nums">
                      {graded ? `${sub.marksObtained}${sa?.totalMarks ? ` / ${sa.totalMarks}` : ""}` : <span className="font-normal text-slate-400">—</span>}
                    </span>
                    {!isGrading && (
                      <Button size="sm" variant={graded ? "secondary" : "primary"} onClick={() => setGrading({ id: sub.id, marks: graded ? String(sub.marksObtained) : "", feedback: sub.feedback || "" })}>
                        {graded ? "Edit grade" : "Grade"}
                      </Button>
                    )}
                  </div>
                  {(sub.content || sub.submissionFiles?.length > 0) && (
                    <div className="mt-3 ml-11 space-y-2">
                      {sub.content && <p className="text-sm whitespace-pre-line text-slate-700">{sub.content}</p>}
                      {sub.submissionFiles?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">{sub.submissionFiles.map((f) => <FileLink key={f.id ?? f.fileUrl} file={f} />)}</div>
                      )}
                    </div>
                  )}
                  {!isGrading && sub.feedback && <p className="mt-2 ml-11 text-sm text-slate-500 italic">“{sub.feedback}”</p>}
                  {isGrading && (
                    <div className="mt-3 ml-11 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <TextInput
                        type="number"
                        min="0"
                        max={sa?.totalMarks || undefined}
                        step="0.5"
                        value={grading.marks}
                        onChange={(e) => setGrading((g) => ({ ...g, marks: e.target.value }))}
                        placeholder={sa?.totalMarks ? `/ ${sa.totalMarks}` : "Marks"}
                        aria-label={`Marks for ${name}`}
                        autoFocus
                      />
                      <TextArea
                        rows={2}
                        className="min-h-0"
                        value={grading.feedback}
                        onChange={(e) => setGrading((g) => ({ ...g, feedback: e.target.value }))}
                        placeholder="Feedback for the student (optional)"
                        aria-label={`Feedback for ${name}`}
                      />
                      <div className="flex justify-end gap-2 sm:col-span-2">
                        <Button size="sm" variant="ghost" icon={X} onClick={() => setGrading(null)} disabled={savingGrade}>Cancel</Button>
                        <Button size="sm" icon={Save} loading={savingGrade} onClick={saveGrade}>Save grade</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
};

export default Assignments;
