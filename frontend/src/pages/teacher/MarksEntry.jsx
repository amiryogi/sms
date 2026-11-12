import React, { useState, useEffect, useMemo, useRef } from "react";
import { BookOpen, ClipboardList, Save, Users, Undo2, CheckCircle2, Keyboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { examService } from "../../api/examService";
import { teacherService } from "../../api/teacherService";
import { PageHeader, Card, Badge, Button, Field, SelectInput, EmptyState, LoadingBlock, toast, confirmDialog } from "../../components/ui";
import { cn } from "../../lib/cn";
import { fullName } from "../../utils/format";

/**
 * Marks entry, in two flows:
 *
 * - TEACHER: only their own TeacherSubject assignments.
 *   Exam -> [their class-section-subject] -> students.
 * - EXAM_OFFICER / ADMIN: any subject in the exam.
 *   Exam -> class -> section -> subject -> students.
 *
 * The backend enforces both (and the PUBLISHED-only rule); this page only
 * checks that each number is inside the subject's full marks before saving.
 */

const COLS = ["theory", "practical", "remarks"];

const toRows = (studentList, results = []) => {
  const byStudent = new Map(results.map((r) => [r.student.id, r]));
  return studentList
    .map((s) => {
      const r = byStudent.get(s.studentId);
      return {
        studentId: s.studentId,
        rollNumber: s.rollNumber,
        studentName: fullName(s),
        marksObtained: r && !r.isAbsent ? (r.marksObtained ?? "") : "",
        practicalMarks: r && !r.isAbsent ? (r.practicalMarks ?? "") : "",
        isAbsent: Boolean(r?.isAbsent),
        remarks: r?.remarks || "",
      };
    })
    .sort((a, b) => (a.rollNumber || 999) - (b.rollNumber || 999));
};

const rowKey = (m) => (m ? JSON.stringify([String(m.marksObtained), String(m.practicalMarks), m.isAbsent, m.remarks]) : "");
const snapshot = (rows) => Object.fromEntries(rows.map((r) => [r.studentId, { ...r }]));

/** "" when fine, otherwise the problem with this value. */
const rangeError = (value, max) => {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "Not a number";
  if (n < 0) return "Below 0";
  if (max && n > max) return `Above ${max}`;
  return "";
};

const MarksEntry = () => {
  const { user, hasRole } = useAuth();
  const isTeacher = hasRole("TEACHER");
  const isExamOfficer = hasRole("EXAM_OFFICER");
  const isAdmin = hasRole("ADMIN");
  // Teachers use their assignments; exam officers and admins can open any subject.
  const useTeacherFlow = isTeacher && !isExamOfficer && !isAdmin;

  const [exams, setExams] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [saved, setSaved] = useState({}); // studentId -> row as last loaded/saved

  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({ examId: "", assignmentId: "", classId: "", sectionId: "", subjectId: "" });
  const gridRef = useRef(null);

  // ---------- data ----------
  useEffect(() => {
    const loadExams = async () => {
      setLoadingExams(true);
      try {
        const res = await examService.getExamsForMarksEntry();
        setExams((res.data || []).filter((e) => e.status === "PUBLISHED"));
      } catch {
        toast.error("Could not load exams");
      } finally {
        setLoadingExams(false);
      }
    };
    const loadAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const res = await teacherService.getTeacherAssignments({ userId: user?.id });
        setTeacherAssignments(res.data || []);
      } catch {
        toast.error("Could not load your subjects");
      } finally {
        setLoadingAssignments(false);
      }
    };
    loadExams();
    if (useTeacherFlow) loadAssignments();
  }, [useTeacherFlow, user?.id]);

  const selectedExam = useMemo(() => exams.find((e) => e.id?.toString() === filters.examId), [exams, filters.examId]);

  // Teacher: their assignments that are part of the selected exam.
  const teacherAssignmentOptions = useMemo(() => {
    if (!useTeacherFlow || !selectedExam?.examSubjects) return [];
    const inExam = new Set(selectedExam.examSubjects.map((es) => Number(es.classSubjectId)));
    return teacherAssignments
      .filter((ta) => inExam.has(Number(ta.classSubjectId)))
      .map((ta) => ({
        value: `${ta.classSubjectId}-${ta.sectionId}`,
        label: `${ta.classSubject?.class?.name} ${ta.section?.name} · ${ta.classSubject?.subject?.name}`,
      }));
  }, [useTeacherFlow, selectedExam, teacherAssignments]);

  const availableClasses = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects) return [];
    const map = new Map();
    selectedExam.examSubjects.forEach((es) => {
      const cls = es.classSubject?.class;
      if (cls && !map.has(cls.id)) map.set(cls.id, { id: cls.id, name: cls.name, gradeLevel: cls.gradeLevel });
    });
    return [...map.values()].sort((a, b) => a.gradeLevel - b.gradeLevel);
  }, [selectedExam, useTeacherFlow]);

  const availableSections = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects || !filters.classId) return [];
    const map = new Map();
    selectedExam.examSubjects.forEach((es) => {
      if (es.classSubject?.classId?.toString() === filters.classId) {
        (es.sections || []).forEach((sec) => map.set(sec.id, { id: sec.id, name: sec.name }));
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedExam, filters.classId, useTeacherFlow]);

  const availableSubjects = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects || !filters.classId) return [];
    return selectedExam.examSubjects
      .filter((es) => es.classSubject?.classId?.toString() === filters.classId)
      .map((es) => ({ examSubjectId: es.id, subjectName: es.classSubject?.subject?.name, hasPractical: es.hasPractical === true }))
      .sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
  }, [selectedExam, filters.classId, useTeacherFlow]);

  // The exam subject and section the grid is for, in either flow.
  const target = useMemo(() => {
    if (!selectedExam?.examSubjects) return null;
    if (useTeacherFlow) {
      if (!filters.assignmentId) return null;
      const [classSubjectId, sectionId] = filters.assignmentId.split("-");
      const examSubject = selectedExam.examSubjects.find((es) => es.classSubjectId?.toString() === classSubjectId);
      return examSubject ? { examSubject, sectionId } : null;
    }
    if (!filters.subjectId || !filters.sectionId) return null;
    const examSubject = selectedExam.examSubjects.find((es) => es.id?.toString() === filters.subjectId);
    return examSubject ? { examSubject, sectionId: filters.sectionId } : null;
  }, [selectedExam, useTeacherFlow, filters.assignmentId, filters.subjectId, filters.sectionId]);

  const targetKey = target ? `${target.examSubject.id}-${target.sectionId}` : "";

  useEffect(() => {
    if (!target) {
      setMarksData([]);
      setSaved({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingStudents(true);
      try {
        const studentsRes = await examService.getStudentsForMarksEntry(target.examSubject.id, target.sectionId);
        let results = [];
        try {
          const resultsRes = await examService.getResultsBySubject(target.examSubject.id, target.sectionId);
          results = resultsRes.data?.results || [];
        } catch {
          // No marks entered yet.
        }
        if (cancelled) return;
        const rows = toRows(studentsRes.data?.students || [], results);
        setMarksData(rows);
        setSaved(snapshot(rows));
      } catch (error) {
        if (!cancelled) {
          setMarksData([]);
          toast.error(error.response?.data?.message || "Could not load students");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // targetKey identifies the target; the object itself changes identity on every exams refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  // ---------- derived ----------
  const es = target?.examSubject;
  const hasTheory = es ? es.hasTheory !== false : true;
  const hasPractical = es?.hasPractical === true;
  const theoryMax = es?.theoryFullMarks || es?.fullMarks || 100;
  const practicalMax = es?.practicalFullMarks || 0;

  const rowErrors = (m) => ({
    theory: m.isAbsent ? "" : rangeError(m.marksObtained, theoryMax),
    practical: m.isAbsent || !hasPractical ? "" : rangeError(m.practicalMarks, practicalMax),
  });

  const stats = useMemo(() => {
    let entered = 0;
    let absent = 0;
    let invalid = 0;
    let changed = 0;
    marksData.forEach((m) => {
      if (m.isAbsent) absent += 1;
      else if (m.marksObtained !== "" || (hasPractical && m.practicalMarks !== "")) entered += 1;
      const e = rowErrors(m);
      if (e.theory || e.practical) invalid += 1;
      if (rowKey(saved[m.studentId]) !== rowKey(m)) changed += 1;
    });
    return { entered, absent, invalid, changed, pending: marksData.length - entered - absent };
    // rowErrors only depends on the values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksData, saved, hasPractical, theoryMax, practicalMax]);

  // ---------- handlers ----------
  const handleFilterChange = async (field, value) => {
    if (stats.changed > 0) {
      const ok = await confirmDialog({
        title: "Discard unsaved marks?",
        message: `${stats.changed} row(s) have changes that are not saved yet.`,
        confirmLabel: "Discard",
        tone: "danger",
      });
      if (!ok) return;
    }
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "examId") Object.assign(next, { assignmentId: "", classId: "", sectionId: "", subjectId: "" });
      else if (field === "classId") Object.assign(next, { sectionId: "", subjectId: "" });
      return next;
    });
  };

  const updateMarks = (studentId, field, value) => {
    setMarksData((prev) => prev.map((m) => (m.studentId === studentId ? { ...m, [field]: value } : m)));
  };

  const discard = () => setMarksData((prev) => prev.map((m) => (saved[m.studentId] ? { ...saved[m.studentId] } : m)));

  /** Spreadsheet keys: Enter / ArrowDown -> next row, ArrowUp -> previous row, same column. */
  const onCellKey = (e, rowIndex, col) => {
    let next = null;
    if (e.key === "Enter" || e.key === "ArrowDown") next = rowIndex + 1;
    else if (e.key === "ArrowUp") next = rowIndex - 1;
    if (next === null) return;
    e.preventDefault();
    for (let i = next; i >= 0 && i < marksData.length; i += next > rowIndex ? 1 : -1) {
      const cell = gridRef.current?.querySelector(`[data-row="${i}"][data-col="${col}"]`);
      if (cell && !cell.disabled) {
        cell.focus();
        cell.select?.();
        return;
      }
    }
  };

  const handleSave = async () => {
    if (!target) return;
    if (stats.invalid > 0) {
      toast.error(`Fix the ${stats.invalid} highlighted row(s) first.`);
      gridRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const resultsToSave = marksData
      .filter((m) => m.marksObtained !== "" || m.practicalMarks !== "" || m.isAbsent)
      .map((m) => ({
        studentId: m.studentId,
        marksObtained: m.isAbsent ? 0 : parseFloat(m.marksObtained) || 0,
        practicalMarks: m.isAbsent ? 0 : parseFloat(m.practicalMarks) || 0,
        isAbsent: m.isAbsent,
        remarks: m.remarks || "",
      }));
    if (resultsToSave.length === 0) return toast.info("Enter marks for at least one student first.");

    setSaving(true);
    try {
      await examService.saveResults({
        examSubjectId: target.examSubject.id,
        sectionId: parseInt(target.sectionId),
        results: resultsToSave,
      });
      setSaved(snapshot(marksData));
      toast.success(`Marks saved for ${resultsToSave.length} student(s)`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save marks");
    } finally {
      setSaving(false);
    }
  };

  // ---------- render ----------
  if (!isTeacher && !isExamOfficer && !isAdmin) {
    return <EmptyState icon={ClipboardList} title="No access" description="You do not have permission to enter marks." />;
  }

  const showGrid = Boolean(target);
  const cellBase =
    "h-9 w-full rounded-md border bg-white px-2.5 text-sm tabular-nums outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className={cn("mx-auto max-w-6xl space-y-6", stats.changed > 0 && "pb-24")}>
      <PageHeader
        icon={ClipboardList}
        title="Marks Entry"
        description={useTeacherFlow ? "Enter marks for the subjects you teach." : "Enter marks for any subject in a published exam."}
      />

      <Card>
        <div className={cn("grid gap-4", useTeacherFlow ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
          <Field label="Exam" htmlFor="me-exam">
            <SelectInput id="me-exam" value={filters.examId} onChange={(e) => handleFilterChange("examId", e.target.value)} disabled={loadingExams}>
              <option value="">{loadingExams ? "Loading…" : exams.length ? "Select exam" : "No published exams"}</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </SelectInput>
          </Field>

          {useTeacherFlow ? (
            <Field
              label="Class, section and subject"
              htmlFor="me-assignment"
              error={filters.examId && !loadingAssignments && teacherAssignmentOptions.length === 0 ? "None of your subjects are in this exam." : undefined}
            >
              <SelectInput
                id="me-assignment"
                value={filters.assignmentId}
                onChange={(e) => handleFilterChange("assignmentId", e.target.value)}
                disabled={!filters.examId || loadingAssignments}
              >
                <option value="">{loadingAssignments ? "Loading…" : "Select your subject"}</option>
                {teacherAssignmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <>
              <Field label="Class" htmlFor="me-class">
                <SelectInput id="me-class" value={filters.classId} onChange={(e) => handleFilterChange("classId", e.target.value)} disabled={!filters.examId || availableClasses.length === 0}>
                  <option value="">Select class</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Section" htmlFor="me-section">
                <SelectInput id="me-section" value={filters.sectionId} onChange={(e) => handleFilterChange("sectionId", e.target.value)} disabled={!filters.classId || availableSections.length === 0}>
                  <option value="">Select section</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Subject" htmlFor="me-subject">
                <SelectInput id="me-subject" value={filters.subjectId} onChange={(e) => handleFilterChange("subjectId", e.target.value)} disabled={!filters.classId || availableSubjects.length === 0}>
                  <option value="">Select subject</option>
                  {availableSubjects.map((s) => (
                    <option key={s.examSubjectId} value={s.examSubjectId}>
                      {s.subjectName} {s.hasPractical ? "(Th + Pr)" : "(Th)"}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </>
          )}
        </div>
      </Card>

      {!showGrid ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={!filters.examId ? "Choose an exam" : useTeacherFlow ? "Choose your subject" : "Choose class, section and subject"}
            description="Only published exams accept marks. Once an exam is locked, marks can no longer change."
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {/* Subject summary */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900">{es?.classSubject?.subject?.name}</h2>
              <p className="text-sm text-slate-500">{selectedExam?.name}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hasTheory && <Badge tone="info">Theory {theoryMax}</Badge>}
              {hasPractical && <Badge tone="success">Practical {practicalMax}</Badge>}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-slate-400" aria-hidden="true" />{marksData.length}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" aria-hidden="true" />{stats.entered} entered</span>
              {stats.absent > 0 && <span>{stats.absent} absent</span>}
              {stats.pending > 0 && <span className="text-amber-700">{stats.pending} left</span>}
            </div>
            {marksData.length > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width]"
                  style={{ width: `${Math.round(((stats.entered + stats.absent) / marksData.length) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {loadingStudents ? (
            <LoadingBlock text="Loading students…" />
          ) : marksData.length === 0 ? (
            <EmptyState icon={Users} title="No students" description="No students are enrolled in this section for the current year." />
          ) : (
            <>
              <div ref={gridRef} className="max-h-[calc(100vh-18rem)] min-h-64 overflow-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="col-roll w-16 border-b border-slate-200 px-4 py-2.5 font-medium">Roll</th>
                      <th className="col-name sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Student</th>
                      {hasTheory && <th className="col-marks w-32 border-b border-slate-200 px-2 py-2.5 font-medium">Theory <span className="normal-case text-slate-400">/{theoryMax}</span></th>}
                      {hasPractical && <th className="col-marks w-32 border-b border-slate-200 px-2 py-2.5 font-medium">Practical <span className="normal-case text-slate-400">/{practicalMax}</span></th>}
                      {hasPractical && <th className="w-20 border-b border-slate-200 px-2 py-2.5 text-right font-medium">Total</th>}
                      <th className="w-24 border-b border-slate-200 px-2 py-2.5 text-center font-medium">Absent</th>
                      <th className="col-remarks border-b border-slate-200 px-2 py-2.5 pr-4 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksData.map((m, i) => {
                      const errs = rowErrors(m);
                      const dirty = rowKey(saved[m.studentId]) !== rowKey(m);
                      const total = (parseFloat(m.marksObtained) || 0) + (parseFloat(m.practicalMarks) || 0);
                      const rowBg = errs.theory || errs.practical ? "bg-red-50/60" : m.isAbsent ? "bg-slate-50" : "bg-white";
                      return (
                        <tr key={m.studentId} className={cn("group", rowBg)}>
                          <td className={cn("col-roll border-b border-slate-100 px-4 py-1.5 text-slate-500 tabular-nums", dirty && "shadow-[inset_3px_0_0] shadow-brand-500")}>{m.rollNumber || "—"}</td>
                          <td className={cn("col-name sticky left-0 border-b border-slate-100 px-4 py-1.5 font-medium text-slate-900", rowBg)}>
                            <span className="block max-w-56 truncate">{m.studentName}</span>
                          </td>
                          {hasTheory && (
                            <td className="col-marks border-b border-slate-100 px-2 py-1.5 align-top">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max={theoryMax}
                                step="0.01"
                                data-row={i}
                                data-col="theory"
                                value={m.marksObtained}
                                disabled={m.isAbsent}
                                placeholder={m.isAbsent ? "Abs" : "—"}
                                aria-label={`Theory marks for ${m.studentName}`}
                                aria-invalid={errs.theory ? true : undefined}
                                title={errs.theory || undefined}
                                onChange={(e) => updateMarks(m.studentId, "marksObtained", e.target.value)}
                                onKeyDown={(e) => onCellKey(e, i, "theory")}
                                onFocus={(e) => e.target.select()}
                                className={cn(cellBase, errs.theory ? "border-red-400 text-red-700" : "border-slate-200")}
                              />
                              {errs.theory && <p className="mt-0.5 text-[11px] font-medium text-red-600">{errs.theory}</p>}
                            </td>
                          )}
                          {hasPractical && (
                            <td className="col-marks border-b border-slate-100 px-2 py-1.5 align-top">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max={practicalMax}
                                step="0.01"
                                data-row={i}
                                data-col="practical"
                                value={m.practicalMarks}
                                disabled={m.isAbsent}
                                placeholder={m.isAbsent ? "Abs" : "—"}
                                aria-label={`Practical marks for ${m.studentName}`}
                                aria-invalid={errs.practical ? true : undefined}
                                title={errs.practical || undefined}
                                onChange={(e) => updateMarks(m.studentId, "practicalMarks", e.target.value)}
                                onKeyDown={(e) => onCellKey(e, i, "practical")}
                                onFocus={(e) => e.target.select()}
                                className={cn(cellBase, errs.practical ? "border-red-400 text-red-700" : "border-slate-200")}
                              />
                              {errs.practical && <p className="mt-0.5 text-[11px] font-medium text-red-600">{errs.practical}</p>}
                            </td>
                          )}
                          {hasPractical && (
                            <td className="border-b border-slate-100 px-2 py-1.5 text-right font-medium text-slate-700 tabular-nums">
                              {m.isAbsent || (m.marksObtained === "" && m.practicalMarks === "") ? "—" : total}
                            </td>
                          )}
                          <td className="border-b border-slate-100 px-2 py-1.5 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={m.isAbsent}
                              aria-label={`${m.studentName} absent`}
                              onClick={() => updateMarks(m.studentId, "isAbsent", !m.isAbsent)}
                              className={cn(
                                "cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ring-inset",
                                m.isAbsent ? "bg-amber-100 text-amber-800 ring-amber-300" : "bg-white text-slate-400 ring-slate-200 hover:text-slate-600",
                              )}
                            >
                              {m.isAbsent ? "Absent" : "Present"}
                            </button>
                          </td>
                          <td className="col-remarks border-b border-slate-100 px-2 py-1.5 pr-4">
                            <input
                              type="text"
                              data-row={i}
                              data-col="remarks"
                              value={m.remarks}
                              placeholder="Optional"
                              aria-label={`Remarks for ${m.studentName}`}
                              onChange={(e) => updateMarks(m.studentId, "remarks", e.target.value)}
                              onKeyDown={(e) => onCellKey(e, i, "remarks")}
                              className={cn(cellBase, "border-transparent bg-transparent hover:border-slate-200 focus:bg-white")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                  <Keyboard size={14} aria-hidden="true" /> Enter or ↓ moves down a row, ↑ moves up.
                </p>
                <Button icon={Save} loading={saving} onClick={handleSave} disabled={stats.changed === 0}>
                  Save Marks
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Sticky save bar while there are unsaved changes */}
      {showGrid && stats.changed > 0 && (
        <div data-save-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64 print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-sm text-slate-700">
              <strong className="font-semibold">{stats.changed}</strong> unsaved {stats.changed === 1 ? "row" : "rows"}
              {stats.invalid > 0 && <span className="ml-2 text-red-600">· {stats.invalid} with errors</span>}
            </span>
            <span className="flex-1" />
            <Button variant="ghost" icon={Undo2} onClick={discard} disabled={saving}>Discard</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>Save Marks</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntry;
