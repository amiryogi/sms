import React, { useCallback, useEffect, useState } from "react";
import { NotebookPen, FileText, Upload, CheckCircle2, Clock, AlertCircle, MessageSquareText } from "lucide-react";
import { assignmentService } from "../../api/assignmentService";
import { PageHeader, Card, Badge, Button, Tabs, EmptyState, LoadingBlock, Field, TextArea, Alert, toast } from "../../components/ui";
import { FileUpload } from "../../components/common/FormElements";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../components/shadcn/accordion";
import { resolveAssetUrl } from "../../utils/assets";
import { formatDate, formatDateTime } from "../../utils/format";

const dayDiff = (iso) => Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

const stateOf = (a) => {
  const sub = a.submissions?.[0];
  if (sub?.status === "graded" || (sub && sub.marksObtained !== null && sub.marksObtained !== undefined)) return "graded";
  if (sub) return "submitted";
  return dayDiff(a.dueDate) < 0 ? "overdue" : "todo";
};

const STATE_BADGE = {
  todo: { tone: "warning", label: "To do", icon: Clock },
  overdue: { tone: "danger", label: "Past due", icon: AlertCircle },
  submitted: { tone: "info", label: "Submitted", icon: CheckCircle2 },
  graded: { tone: "success", label: "Graded", icon: CheckCircle2 },
};

/** Hand-in form for one assignment: a written answer and/or files (one submission each). */
const SubmitForm = ({ assignment, onDone }) => {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const late = dayDiff(assignment.dueDate) < 0;

  const submit = async () => {
    if (!content.trim() && files.length === 0) return setError("Write an answer or attach at least one file.");
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("assignmentId", assignment.id);
      if (content.trim()) formData.append("content", content.trim());
      Array.from(files).forEach((f) => formData.append("files", f));
      await assignmentService.submitAssignment(formData);
      toast.success(late ? "Submitted (marked late)" : "Submitted");
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-4">
      <p className="mb-3 text-sm font-medium text-slate-900">Hand in your work</p>
      {late && <Alert tone="warning" className="mb-3">The due date has passed. You can still hand it in; it will be marked late.</Alert>}
      <Field label="Answer (optional)" htmlFor={`answer-${assignment.id}`}>
        <TextArea id={`answer-${assignment.id}`} rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
      </Field>
      <div className="mt-3">
        <FileUpload label="Files (optional)" multiple files={files} onChange={setFiles} hint="PDF, Word, images. You can hand in only once." />
      </div>
      {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
      <Button icon={Upload} loading={saving} onClick={submit}>Submit</Button>
    </div>
  );
};

/**
 * The student's assignments, newest due first. Each one opens (shadcn
 * Accordion) to show instructions, the teacher's files, and either the
 * hand-in form or what was handed in with any marks and feedback.
 */
const Assignments = () => {
  const [assignments, setAssignments] = useState(null);
  const [filter, setFilter] = useState("open");

  const load = useCallback(
    () =>
      assignmentService
        .getAssignments()
        .then((res) => setAssignments(res.data || []))
        .catch(() => {
          setAssignments([]);
          toast.error("Could not load assignments");
        }),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (assignments === null) return <Card><LoadingBlock text="Loading assignments…" /></Card>;

  const counts = { open: 0, done: 0 };
  for (const a of assignments) counts[["todo", "overdue"].includes(stateOf(a)) ? "open" : "done"] += 1;
  const visible = assignments
    .filter((a) => filter === "all" || (filter === "open" ? ["todo", "overdue"].includes(stateOf(a)) : ["submitted", "graded"].includes(stateOf(a))))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader icon={NotebookPen} title="My assignments" description="Work set by your teachers. Open one to see the details and hand it in." />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "open", label: "To do", count: counts.open },
          { value: "done", label: "Handed in", count: counts.done },
          { value: "all", label: "All", count: assignments.length },
        ]}
      />
      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={NotebookPen} title={filter === "open" ? "Nothing to do" : "No assignments here"} description={filter === "open" ? "You're all caught up." : undefined} />
        </Card>
      ) : (
        <Card padding="none" className="px-5">
          <Accordion type="single" collapsible>
            {visible.map((a) => {
              const state = stateOf(a);
              const badge = STATE_BADGE[state];
              const sub = a.submissions?.[0];
              const subject = a.teacherSubject?.classSubject?.subject?.name;
              const days = dayDiff(a.dueDate);
              return (
                <AccordionItem key={a.id} value={String(a.id)}>
                  <AccordionTrigger className="py-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-900">{a.title}</span>
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">
                        {subject ? `${subject} · ` : ""}due {formatDate(a.dueDate)}
                        {state === "todo" && (days === 0 ? " (today)" : days === 1 ? " (tomorrow)" : days <= 7 ? ` (in ${days} days)` : "")}
                        {a.totalMarks ? ` · ${a.totalMarks} marks` : ""}
                      </span>
                    </span>
                    <Badge tone={badge.tone} icon={badge.icon} className="shrink-0">{badge.label}</Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    {a.description ? <p className="whitespace-pre-line text-slate-700">{a.description}</p> : <p className="text-slate-500">No written instructions.</p>}
                    {a.assignmentFiles?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.assignmentFiles.map((f) => (
                          <a
                            key={f.id ?? f.fileUrl}
                            href={resolveAssetUrl(f.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <FileText size={13} aria-hidden="true" /> {f.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    {sub ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-700">
                          Handed in {formatDateTime(sub.submittedAt)}
                          {sub.status === "late" && <Badge tone="warning" className="ml-2">Late</Badge>}
                        </p>
                        {sub.marksObtained !== null && sub.marksObtained !== undefined && (
                          <p className="mt-2 text-lg font-semibold text-slate-900 tabular-nums">
                            {Number(sub.marksObtained)}
                            {a.totalMarks ? <span className="text-sm font-normal text-slate-500"> / {a.totalMarks}</span> : null}
                          </p>
                        )}
                        {sub.feedback && (
                          <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                            <MessageSquareText size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                            {sub.feedback}
                          </p>
                        )}
                      </div>
                    ) : (
                      <SubmitForm assignment={a} onDone={load} />
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Card>
      )}
    </div>
  );
};

export default Assignments;
