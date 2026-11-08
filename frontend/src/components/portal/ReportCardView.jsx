import React, { useEffect, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { reportCardService } from "../../api/reportCardService";
import { Card, Button, SelectInput, EmptyState, LoadingBlock } from "../ui";
import NepalReportCard from "../common/NepalReportCard";

/**
 * The printable report card (the school's own layout, unchanged) for one of
 * the student's PUBLISHED exams. The sheet keeps its own print styles; the
 * .rc-embedded wrapper (styles/app.css) shows it inline instead of as an
 * overlay, and the app shell hides itself when printing.
 */
const ReportCardView = ({ studentId }) => {
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
      .catch((err) => alive && setError(err.response?.data?.message || "Could not load the report card"));
    return () => {
      alive = false;
    };
  }, [studentId, examId]);

  if (exams === null) return <Card><LoadingBlock text="Loading report cards…" /></Card>;
  if (exams.length === 0) {
    return <Card><EmptyState icon={FileText} title="No report card yet" description="It appears here once the school publishes it." /></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="w-full max-w-sm">
          <SelectInput aria-label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((e) => (
              <option key={e.examId || e.id} value={e.examId || e.id}>
                {e.examName || e.name}
                {e.academicYear ? ` · ${e.academicYear}` : ""}
              </option>
            ))}
          </SelectInput>
        </div>
        <Button icon={Printer} onClick={() => window.print()} disabled={!card}>
          Print / Save as PDF
        </Button>
      </div>
      {error ? (
        <Card><EmptyState icon={FileText} title="Report card unavailable" description={error} /></Card>
      ) : !card ? (
        <Card><LoadingBlock text="Loading report card…" /></Card>
      ) : (
        <div className="rc-embedded overflow-x-auto rounded-card bg-slate-100 p-4 print:overflow-visible print:bg-white print:p-0">
          <NepalReportCard data={card} showActions={false} />
        </div>
      )}
    </div>
  );
};

export default ReportCardView;
