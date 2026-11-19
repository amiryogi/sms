import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Printer,
  RefreshCw,
  Users,
  Medal,
  Search,
} from "lucide-react";
import { Select, Button } from "../../components/common/FormElements";
import NepalReportCard from "../../components/common/NepalReportCard";
import BulkReportCardPrint from "../../components/common/BulkReportCardPrint";
import WorkingDaysEditor from "../../components/admin/WorkingDaysEditor";
import { PageHeader, PageShell, Card, Badge, EmptyState, LoadingBlock, StatCard, StatGroup, toast, confirmDialog } from "../../components/ui";
import { reportCardService } from "../../api/reportCardService";
import { examService } from "../../api/examService";
import { academicService } from "../../api/academicService";
import { fullName } from "../../utils/format";

const MEDAL = { 1: "text-amber-500", 2: "text-slate-400", 3: "text-orange-700" };

const ReportCards = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [bulkPrintData, setBulkPrintData] = useState(null);
  const [bulkPrintLoading, setBulkPrintLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sections are global labels; any class can use them.
  useEffect(() => {
    if (selectedClass) {
      setSections(allSections);
      setSelectedSection("");
    } else {
      setSections([]);
    }
  }, [selectedClass, allSections]);

  const fetchInitialData = async () => {
    try {
      const [examsRes, classesRes, sectionsRes] = await Promise.all([
        examService.getExams(),
        academicService.getClasses(),
        academicService.getSections(),
      ]);
      setExams((examsRes.data || []).filter((e) => e.status === "PUBLISHED" || e.status === "LOCKED"));
      setClasses(classesRes.data || []);
      setAllSections(sectionsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load exams and classes");
    }
  };

  const fetchReportCards = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) {
      toast.info("Choose an exam, class and section first.");
      return;
    }
    setLoading(true);
    try {
      const response = await reportCardService.getReportCards(selectedExam, selectedClass, selectedSection);
      setReportData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load report cards");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;
    const ok = await confirmDialog({
      title: allGenerated ? "Regenerate report cards?" : "Generate report cards?",
      message:
        "Calculates totals, grades, GPA, rank and attendance for every student in this section from the marks entered so far. Existing cards are recalculated.",
      confirmLabel: allGenerated ? "Regenerate" : "Generate",
    });
    if (!ok) return;
    setGenerating(true);
    try {
      await reportCardService.generateReportCards(selectedExam, selectedClass, selectedSection);
      toast.success("Report cards generated");
      fetchReportCards();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not generate report cards");
    } finally {
      setGenerating(false);
    }
  };

  const setPublished = async (publish) => {
    if (!selectedExam || !selectedClass || !selectedSection) return;
    const ok = await confirmDialog({
      title: publish ? "Publish report cards?" : "Unpublish report cards?",
      message: publish
        ? "Students and parents of this section will be able to view and download them."
        : "Students and parents will no longer see them.",
      confirmLabel: publish ? "Publish" : "Unpublish",
      tone: publish ? undefined : "danger",
    });
    if (!ok) return;
    setPublishing(true);
    try {
      if (publish) await reportCardService.publishReportCards(selectedExam, selectedClass, selectedSection);
      else await reportCardService.unpublishReportCards(selectedExam, selectedClass, selectedSection);
      toast.success(publish ? "Report cards published" : "Report cards unpublished");
      fetchReportCards();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not change publication");
    } finally {
      setPublishing(false);
    }
  };

  const handlePreview = async (studentId) => {
    if (!selectedExam) return;
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const response = await reportCardService.getReportCard(studentId, selectedExam);
      setPreviewData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the report card");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const handleBulkPrint = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;
    setBulkPrintLoading(true);
    setBulkPrintOpen(true);
    try {
      const response = await reportCardService.getBulkReportCards(selectedExam, selectedClass, selectedSection);
      setBulkPrintData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load report cards for printing");
      setBulkPrintOpen(false);
    } finally {
      setBulkPrintLoading(false);
    }
  };

  const closeBulkPrint = () => {
    setBulkPrintOpen(false);
    setBulkPrintData(null);
  };

  const examOptions = exams.map((e) => ({ value: e.id.toString(), label: `${e.name} (${e.status.toLowerCase()})` }));
  const classOptions = classes.map((c) => ({ value: c.id.toString(), label: c.name }));
  const sectionOptions = sections.map((s) => ({ value: s.id.toString(), label: s.name }));

  const summary = reportData?.summary || {};
  const students = reportData?.students || [];
  const allGenerated = students.length > 0 && students.every((s) => s.reportCard);
  const allPublished = students.length > 0 && students.every((s) => s.reportCard?.isPublished);
  const somePublished = students.some((s) => s.reportCard?.isPublished);

  return (
    <PageShell>
      <PageHeader
        title="Report cards"
        description="Generate grade sheets from entered marks, check them, then publish to students and parents."
      />

      {/* Selection */}
      <Card padding="md">
        <div className="grid items-end gap-x-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]" data-guide="reportCards.filters">
          <Select label="Exam" name="examId" options={examOptions} value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} placeholder="Select exam…" />
          <Select label="Class" name="classId" options={classOptions} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} placeholder="Select class…" />
          <Select
            label="Section"
            name="sectionId"
            options={sectionOptions}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            placeholder="Select section…"
            disabled={!selectedClass}
          />
          <Button onClick={fetchReportCards} loading={loading} icon={Search} className="mb-4">
            View report cards
          </Button>
        </div>
      </Card>

      {reportData && (
        <Card padding="md">
          {/* Counts are ink; only failures, which need attention, carry the risk colour. */}
          <StatGroup columns={5} surface="plain" size="sm" className="-mx-5 -mt-5 mb-5 border-b border-slate-200">
            <StatCard label="Students" value={summary.totalStudents || 0} />
            <StatCard label="Generated" value={summary.reportCardsGenerated || 0} />
            <StatCard label="Published" value={summary.published || 0} />
            <StatCard label="Passed" value={summary.passed || 0} />
            <StatCard label="Failed" value={summary.failed || 0} tone={summary.failed > 0 ? "risk" : "ink"} />
          </StatGroup>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-end">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={RefreshCw} onClick={handleGenerate} loading={generating} disabled={students.length === 0} data-guide="reportCards.generate">
                {allGenerated ? "Regenerate" : "Generate"} report cards
              </Button>
              {allGenerated && !allPublished && (
                <Button variant="primary" icon={Eye} onClick={() => setPublished(true)} loading={publishing} data-guide="reportCards.publish">
                  Publish all
                </Button>
              )}
              {somePublished && (
                <Button variant="secondary" icon={EyeOff} onClick={() => setPublished(false)} loading={publishing}>
                  Unpublish all
                </Button>
              )}
              {allGenerated && (
                <Button icon={Printer} onClick={handleBulkPrint} loading={bulkPrintLoading} data-guide="reportCards.printAll">
                  Print all
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{summary.examName}</span>, {summary.class?.name} {summary.section?.name},{" "}
              {summary.academicYear}
            </p>
            <WorkingDaysEditor attendance={summary.attendance} onSaved={fetchReportCards} />
          </div>
        </Card>
      )}

      {reportData && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-base font-semibold text-slate-900">Students</h2>
          </div>
          {students.length === 0 ? (
            <EmptyState compact icon={Users} title="No students in this section" description="Enrol students on the Students page first." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                    <th scope="col" className="col-roll text-right">Roll</th>
                    <th scope="col" className="col-name text-left">Student</th>
                    <th scope="col" className="text-center">Subjects</th>
                    <th scope="col" className="col-marks text-right">Total</th>
                    <th scope="col" className="text-right">%</th>
                    <th scope="col" className="text-right">GPA</th>
                    <th scope="col" className="text-center">Grade</th>
                    <th scope="col" className="text-right">Rank</th>
                    <th scope="col" className="text-center">Result</th>
                    <th scope="col" className="text-center">Card</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 [&_td]:px-4 [&_td]:py-2.5">
                  {students.map((s) => {
                    const total = (s.passedSubjects || 0) + (s.failedSubjects || 0);
                    const rank = s.reportCard?.classRank;
                    return (
                      <tr key={s.studentId} className="hover:bg-slate-50">
                        <td className="col-roll text-right text-slate-500 tabular-nums">{s.rollNumber}</td>
                        <td className="col-name font-medium text-slate-900">
                          {fullName(s)}
                        </td>
                        <td className="text-center tabular-nums">
                          {/* A failed subject is a status; a clean pass is just the count. */}
                          <span className={s.failedSubjects > 0 ? "font-medium text-risk" : "text-slate-900"}>{s.passedSubjects || 0}</span>
                          <span className="text-slate-400">/{total}</span>
                        </td>
                        <td className="col-marks text-right tabular-nums">
                          <span className="font-medium text-slate-900">{s.totalObtained?.toFixed(1) || 0}</span>
                          <span className="text-slate-400">/{s.totalFull || 0}</span>
                        </td>
                        <td className="text-right tabular-nums">{s.percentage?.toFixed(1)}%</td>
                        <td className="text-right">
                          <span className="font-semibold text-slate-900 tabular-nums">{s.gpa?.toFixed(2)}</span>
                        </td>
                        <td className="text-center">
                          <Badge tone={s.isPassed ? "neutral" : "danger"}>{s.overallGrade || "—"}</Badge>
                        </td>
                        <td className="text-right">
                          {rank ? (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              {rank <= 3 && <Medal size={15} className={MEDAL[rank]} aria-hidden="true" />}#{rank}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {s.isPassed ? <Badge tone="success">Passed</Badge> : <Badge tone="danger">Failed</Badge>}
                        </td>
                        <td className="text-center">
                          {s.reportCard ? (
                            s.reportCard.isPublished ? (
                              <Badge tone="success" icon={CheckCircle2}>Published</Badge>
                            ) : (
                              <Badge tone="warning">Draft</Badge>
                            )
                          ) : (
                            <Badge>Not generated</Badge>
                          )}
                        </td>
                        <td className="text-right py-1!">
                          <Button variant="ghost" icon={Printer} onClick={() => handlePreview(s.studentId)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!reportData && !loading && (
        <Card>
          <EmptyState
            title="Choose a section to start"
            description="Pick an exam, class and section above. Only published or locked exams are listed."
          />
        </Card>
      )}

      {previewOpen &&
        (previewLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
            <div className="rounded-2xl bg-white px-10 py-6 shadow-pop">
              <LoadingBlock text="Loading report card…" className="py-2" />
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" onClick={closePreview}>Cancel</Button>
              </div>
            </div>
          </div>
        ) : previewData ? (
          <NepalReportCard data={previewData} onClose={closePreview} showActions={true} />
        ) : null)}

      {bulkPrintOpen && <BulkReportCardPrint data={bulkPrintData} onClose={closeBulkPrint} loading={bulkPrintLoading} />}
    </PageShell>
  );
};

export default ReportCards;
