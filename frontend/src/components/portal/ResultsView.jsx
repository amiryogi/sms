import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import { reportCardService } from "../../api/reportCardService";
import { Card, Badge, Tabs, SelectInput, EmptyState, LoadingBlock, StatCard, StatGroup } from "../ui";
import { cn } from "../../lib/cn";

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
          <SelectInput aria-label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)} data-guide="results.exam">
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
                  {card.student.class} {card.student.section}, {card.examination.academicYear}. Graded on {card.meta.gradeScale}.
                </p>
              </div>
              {s.isPassed ? (
                <Badge tone="success" icon={CheckCircle2}>Passed</Badge>
              ) : (
                <Badge tone="danger" icon={XCircle}>Not passed</Badge>
              )}
            </div>
            {/* The result's figures, ruled across the foot of the card like the
                totals row of the printed grade sheet. */}
            <StatGroup columns={4} surface="well" className="-mx-5 -mb-5 rounded-b-xl border-t border-slate-200">
              <StatCard label="GPA" value={s.gpa !== null && s.gpa !== undefined ? Number(s.gpa).toFixed(2) : "—"} sub={`Grade ${s.grade || "—"}`} />
              <StatCard label="Percentage" value={s.percentage !== null && s.percentage !== undefined ? `${Number(s.percentage).toFixed(1)}%` : "—"} sub={`${marks(s.totalMarks)} of ${marks(s.totalFullMarks)} marks`} />
              <StatCard label="Class rank" value={s.classRank || "—"} />
              <StatCard
                label="Subjects passed"
                value={`${s.passedSubjects ?? "—"}/${s.totalSubjects ?? "—"}`}
                sub={s.failedSubjects ? <span className="font-medium text-risk">{s.failedSubjects} not passed</span> : undefined}
              />
            </StatGroup>
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
