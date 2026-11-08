import React, { useEffect, useState } from "react";
import { Award, Trophy, Percent, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import { reportCardService } from "../../api/reportCardService";
import { Card, Badge, Tabs, SelectInput, EmptyState, LoadingBlock } from "../ui";
import { cn } from "../../lib/cn";

const Stat = ({ icon, label, value, sub }) => {
  const Icon = icon;
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
};

const marks = (v) => (v === null || v === undefined ? "—" : Number(v));

/**
 * Exam results from the student's PUBLISHED report cards (CLAUDE.md §4.7).
 * Grades, GPA and pass/fail come from the server on the school's grade scale
 * (§4.8); this view only shows them. Shared by the student and parent portals.
 */
const ResultsView = ({ studentId }) => {
  const [exams, setExams] = useState(null);
  const [examId, setExamId] = useState("");
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    reportCardService
      .getStudentPublishedExams(studentId)
      .then((res) => {
        const list = res.data || [];
        setExams(list);
        if (list[0]) setExamId(String(list[0].examId || list[0].id));
      })
      .catch(() => setExams([]));
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !examId) return;
    let alive = true;
    reportCardService
      .getReportCard(studentId, examId)
      .then((res) => {
        if (!alive) return;
        setCard(res.data);
        setError("");
      })
      .catch((err) => alive && setError(err.response?.data?.message || "Could not load the result"));
    return () => {
      alive = false;
    };
  }, [studentId, examId]);

  if (exams === null) return <Card><LoadingBlock text="Loading results…" /></Card>;
  if (exams.length === 0) {
    return <Card><EmptyState icon={Award} title="No results yet" description="Results appear here once the school publishes the report cards." /></Card>;
  }

  const options = exams.map((e) => ({ value: String(e.examId || e.id), label: e.examName || e.name }));
  const s = card?.summary;
  const showCard = card && String(card.meta?.reportCardId) && !error;

  return (
    <div className="space-y-6">
      {options.length <= 4 ? (
        <Tabs value={examId} onChange={setExamId} tabs={options} />
      ) : (
        <div className="max-w-sm">
          <SelectInput aria-label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectInput>
        </div>
      )}

      {error ? (
        <Card><EmptyState icon={Award} title="Result unavailable" description={error} /></Card>
      ) : !showCard ? (
        <Card><LoadingBlock text="Loading result…" /></Card>
      ) : (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{card.examination.name}</h2>
                <p className="text-sm text-slate-500">
                  {card.student.class} {card.student.section} · {card.examination.academicYear} · graded on {card.meta.gradeScale}
                </p>
              </div>
              {s.isPassed ? (
                <Badge tone="success" icon={CheckCircle2}>Passed</Badge>
              ) : (
                <Badge tone="danger" icon={XCircle}>Not passed</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat icon={GraduationCap} label="GPA" value={s.gpa !== null && s.gpa !== undefined ? Number(s.gpa).toFixed(2) : "—"} sub={`Grade ${s.grade || "—"}`} />
              <Stat icon={Percent} label="Percentage" value={s.percentage !== null && s.percentage !== undefined ? `${Number(s.percentage).toFixed(1)}%` : "—"} sub={`${marks(s.totalMarks)} / ${marks(s.totalFullMarks)}`} />
              <Stat icon={Trophy} label="Class rank" value={s.classRank || "—"} />
              <Stat icon={Award} label="Subjects passed" value={`${s.passedSubjects ?? "—"} / ${s.totalSubjects ?? "—"}`} sub={s.failedSubjects ? `${s.failedSubjects} not passed` : undefined} />
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Subject</th>
                    <th className="px-4 py-2.5 text-right font-medium">Theory</th>
                    <th className="px-4 py-2.5 text-right font-medium">Practical</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-center font-medium">Grade</th>
                    <th className="px-4 py-2.5 text-right font-medium">GP</th>
                    <th className="px-5 py-2.5 font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {card.subjects.map((sub) => (
                    <tr key={sub.subjectId} className={cn(!sub.isPassed && "bg-red-50/40")}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{sub.subjectName}</p>
                        {sub.subjectCode && <p className="text-xs text-slate-500">{sub.subjectCode}</p>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {sub.isAbsent ? "AB" : `${marks(sub.theoryMarks)} / ${marks(sub.theoryFullMarks)}`}
                        {sub.theoryGrade && <span className="block text-xs text-slate-500">{sub.theoryGrade}</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {sub.hasPractical ? `${marks(sub.practicalMarks)} / ${marks(sub.practicalFullMarks)}` : "—"}
                        {sub.hasPractical && sub.practicalGrade && <span className="block text-xs text-slate-500">{sub.practicalGrade}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{sub.isAbsent ? "—" : `${marks(sub.totalMarks)} / ${marks(sub.totalFullMarks)}`}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex min-w-9 justify-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", sub.isPassed ? "bg-slate-50 text-slate-800 ring-slate-200" : "bg-red-50 text-red-700 ring-red-200")}>
                          {sub.finalGrade || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{sub.finalGpa !== null && sub.finalGpa !== undefined ? Number(sub.finalGpa).toFixed(1) : "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{sub.remark || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(card.remarks?.teacher || card.remarks?.principal) && (
              <div className="grid gap-4 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-2">
                {card.remarks.teacher && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Class teacher</p>
                    <p className="text-slate-800">{card.remarks.teacher}</p>
                  </div>
                )}
                {card.remarks.principal && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Principal</p>
                    <p className="text-slate-800">{card.remarks.principal}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default ResultsView;
