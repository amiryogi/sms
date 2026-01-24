import React, { useState, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Award,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import { Select, Button } from "../../components/common/FormElements";
import NepalReportCard from "../../components/common/NepalReportCard";
import NEBGradeSheet from "../../components/common/NEBGradeSheet";
import BulkReportCardPrint from "../../components/common/BulkReportCardPrint";
import { reportCardService } from "../../api/reportCardService";
import { examService } from "../../api/examService";
import { academicService } from "../../api/academicService";

const ReportCards = () => {
  // Filter state
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Data state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Bulk print state
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [bulkPrintData, setBulkPrintData] = useState(null);
  const [bulkPrintLoading, setBulkPrintLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter sections when class changes
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

      const eligibleExams = (examsRes.data || []).filter(
        (e) => e.status === "PUBLISHED" || e.status === "LOCKED",
      );
      setExams(eligibleExams);
      setClasses(classesRes.data || []);
      setAllSections(sectionsRes.data || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchReportCards = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) {
      alert("Please select Exam, Class, and Section");
      return;
    }

    setLoading(true);
    try {
      const response = await reportCardService.getReportCards(
        selectedExam,
        selectedClass,
        selectedSection,
      );
      setReportData(response.data);
    } catch (error) {
      console.error("Error fetching report cards:", error);
      alert(error.response?.data?.message || "Error fetching report cards");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;

    if (
      !confirm(
        "Generate/recalculate report cards for all students in this section? This will calculate totals, grades, GPA, and ranks using Nepal grading system.",
      )
    )
      return;

    setGenerating(true);
    try {
      await reportCardService.generateReportCards(
        selectedExam,
        selectedClass,
        selectedSection,
      );
      alert("Report cards generated successfully with Nepal GPA grading!");
      fetchReportCards();
    } catch (error) {
      console.error("Error generating report cards:", error);
      alert(error.response?.data?.message || "Error generating report cards");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;

    if (
      !confirm(
        "Publish report cards? Students and parents will be able to view and download them.",
      )
    )
      return;

    setPublishing(true);
    try {
      await reportCardService.publishReportCards(
        selectedExam,
        selectedClass,
        selectedSection,
      );
      alert("Report cards published successfully!");
      fetchReportCards();
    } catch (error) {
      console.error("Error publishing report cards:", error);
      alert(error.response?.data?.message || "Error publishing report cards");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;

    if (
      !confirm(
        "Unpublish report cards? Students and parents will no longer see them.",
      )
    )
      return;

    setPublishing(true);
    try {
      await reportCardService.unpublishReportCards(
        selectedExam,
        selectedClass,
        selectedSection,
      );
      alert("Report cards unpublished.");
      fetchReportCards();
    } catch (error) {
      console.error("Error unpublishing report cards:", error);
      alert(error.response?.data?.message || "Error unpublishing report cards");
    } finally {
      setPublishing(false);
    }
  };

  // Preview individual student report card
  const handlePreview = async (studentId) => {
    if (!selectedExam) return;

    setPreviewLoading(true);
    setPreviewOpen(true);

    try {
      const response = await reportCardService.getReportCard(
        studentId,
        selectedExam,
      );
      setPreviewData(response.data);
    } catch (error) {
      console.error("Error fetching report card:", error);
      alert(
        error.response?.data?.message || "Error loading report card preview",
      );
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  // Bulk print all report cards for the class
  const handleBulkPrint = async () => {
    if (!selectedExam || !selectedClass || !selectedSection) return;

    setBulkPrintLoading(true);
    setBulkPrintOpen(true);

    try {
      const response = await reportCardService.getBulkReportCards(
        selectedExam,
        selectedClass,
        selectedSection,
      );
      setBulkPrintData(response.data);
    } catch (error) {
      console.error("Error fetching bulk report cards:", error);
      alert(
        error.response?.data?.message ||
          "Error loading report cards for printing",
      );
      setBulkPrintOpen(false);
    } finally {
      setBulkPrintLoading(false);
    }
  };

  const closeBulkPrint = () => {
    setBulkPrintOpen(false);
    setBulkPrintData(null);
  };

  const examOptions = exams.map((e) => ({
    value: e.id.toString(),
    label: `${e.name} (${e.status})`,
  }));

  const classOptions = classes.map((c) => ({
    value: c.id.toString(),
    label: c.name,
  }));

  const sectionOptions = sections.map((s) => ({
    value: s.id.toString(),
    label: s.name,
  }));

  // Compute summary stats
  const summary = reportData?.summary || {};
  const students = reportData?.students || [];
  const allGenerated =
    students.length > 0 && students.every((s) => s.reportCard);
  const allPublished =
    students.length > 0 && students.every((s) => s.reportCard?.isPublished);
  const somePublished = students.some((s) => s.reportCard?.isPublished);

  // GPA color helper
  const getGpaColor = (gpa) => {
    if (gpa >= 3.6) return { bg: "#dcfce7", text: "#166534" };
    if (gpa >= 2.8) return { bg: "#dbeafe", text: "#1e40af" };
    if (gpa >= 2.0) return { bg: "#fef3c7", text: "#92400e" };
    if (gpa >= 1.6) return { bg: "#fed7aa", text: "#9a3412" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <FileText className="inline-icon" /> Report Cards
          </h1>
          <p className="text-muted">
            Generate, review, and publish Nepal-style grade sheets
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          className="filter-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          <Select
            label="Exam"
            name="examId"
            options={examOptions}
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            placeholder="Select exam..."
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            placeholder="Select class..."
          />
          <Select
            label="Section"
            name="sectionId"
            options={sectionOptions}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            placeholder="Select section..."
            disabled={!selectedClass}
          />
          <Button onClick={fetchReportCards} disabled={loading}>
            {loading ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Eye size={16} />
            )}
            View Report Cards
          </Button>
        </div>
      </div>

      {/* Summary & Actions */}
      {reportData && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            {/* Summary Stats */}
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div className="stat-item">
                <Users size={20} className="text-primary" />
                <div>
                  <div className="stat-value">{summary.totalStudents || 0}</div>
                  <div className="stat-label">Total Students</div>
                </div>
              </div>
              <div className="stat-item">
                <FileText size={20} className="text-info" />
                <div>
                  <div className="stat-value">
                    {summary.reportCardsGenerated || 0}
                  </div>
                  <div className="stat-label">Generated</div>
                </div>
              </div>
              <div className="stat-item">
                <CheckCircle size={20} className="text-success" />
                <div>
                  <div className="stat-value">{summary.published || 0}</div>
                  <div className="stat-label">Published</div>
                </div>
              </div>
              <div className="stat-item">
                <Award size={20} style={{ color: "#16a34a" }} />
                <div>
                  <div className="stat-value">{summary.passed || 0}</div>
                  <div className="stat-label">Passed</div>
                </div>
              </div>
              <div className="stat-item">
                <AlertCircle size={20} style={{ color: "#dc2626" }} />
                <div>
                  <div className="stat-value">{summary.failed || 0}</div>
                  <div className="stat-label">Failed</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={handleGenerate}
                disabled={generating || students.length === 0}
              >
                {generating ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                {allGenerated ? "Regenerate" : "Generate"} Report Cards
              </Button>

              {allGenerated && !allPublished && (
                <Button
                  variant="success"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                  Publish All
                </Button>
              )}

              {somePublished && (
                <Button
                  variant="warning"
                  onClick={handleUnpublish}
                  disabled={publishing}
                >
                  {publishing ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <EyeOff size={16} />
                  )}
                  Unpublish All
                </Button>
              )}

              {allGenerated && (
                <Button
                  variant="primary"
                  onClick={handleBulkPrint}
                  disabled={bulkPrintLoading}
                >
                  {bulkPrintLoading ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Printer size={16} />
                  )}
                  Print All
                </Button>
              )}
            </div>
          </div>

          {/* Exam Info */}
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#f8fafc",
              borderRadius: "8px",
              fontSize: "0.875rem",
            }}
          >
            <strong>{summary.examName}</strong> | {summary.examType} |{" "}
            {summary.academicYear}
          </div>
        </div>
      )}

      {/* Students Table */}
      {reportData && (
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>
            Student Results (Nepal GPA System)
          </h3>

          {students.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: "2rem" }}>
              <AlertCircle size={48} style={{ opacity: 0.3 }} />
              <p>No students found in this section.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left" }}>
                      Roll
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "left" }}>
                      Name
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Subjects
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Total
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      %
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      GPA
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Grade
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Rank
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Result
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Status
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const gpaColor = getGpaColor(student.gpa || 0);
                    return (
                      <tr
                        key={student.studentId}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "0.75rem" }}>
                          {student.rollNumber}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <span style={{ color: "#16a34a" }}>
                            {student.passedSubjects || 0}
                          </span>
                          /
                          <span
                            style={{
                              color:
                                student.failedSubjects > 0
                                  ? "#dc2626"
                                  : "#64748b",
                            }}
                          >
                            {(student.passedSubjects || 0) +
                              (student.failedSubjects || 0)}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <strong>
                            {student.totalObtained?.toFixed(1) || 0}
                          </strong>
                          <span style={{ color: "#64748b" }}>
                            /{student.totalFull || 0}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          {student.percentage?.toFixed(1)}%
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              background: gpaColor.bg,
                              color: gpaColor.text,
                              fontWeight: "bold",
                            }}
                          >
                            {student.gpa?.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: gpaColor.bg,
                              color: gpaColor.text,
                              padding: "0.25rem 0.5rem",
                            }}
                          >
                            {student.overallGrade || ""}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          {student.reportCard?.classRank ? (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem",
                              }}
                            >
                              {student.reportCard.classRank <= 3 && (
                                <Award
                                  size={16}
                                  style={{
                                    color:
                                      student.reportCard.classRank === 1
                                        ? "#eab308"
                                        : student.reportCard.classRank === 2
                                          ? "#9ca3af"
                                          : "#b45309",
                                  }}
                                />
                              )}
                              #{student.reportCard.classRank}
                            </span>
                          ) : (
                            <span className="text-muted"></span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <span
                            className={`badge ${
                              student.isPassed
                                ? "badge-success"
                                : "badge-danger"
                            }`}
                            style={{ fontSize: "0.75rem" }}
                          >
                            {student.isPassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          {student.reportCard ? (
                            student.reportCard.isPublished ? (
                              <span
                                className="badge badge-success"
                                style={{ fontSize: "0.75rem" }}
                              >
                                <CheckCircle size={12} /> Published
                              </span>
                            ) : (
                              <span
                                className="badge badge-warning"
                                style={{ fontSize: "0.75rem" }}
                              >
                                Draft
                              </span>
                            )
                          ) : (
                            <span
                              className="badge badge-secondary"
                              style={{ fontSize: "0.75rem" }}
                            >
                              Not Generated
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <button
                            className="btn-icon"
                            onClick={() => handlePreview(student.studentId)}
                            title="Preview Report Card"
                            style={{
                              background: "#e0e7ff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "#3730a3",
                            }}
                          >
                            <Printer size={14} />
                            <span style={{ fontSize: "0.75rem" }}>View</span>
                          </button>
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

      {/* No data yet */}
      {!reportData && !loading && (
        <div className="card text-center" style={{ padding: "3rem" }}>
          <FileText size={64} style={{ opacity: 0.2, marginBottom: "1rem" }} />
          <h3>Select Filters to View Report Cards</h3>
          <p className="text-muted">
            Choose an exam, class, and section to view and manage Nepal-style
            grade sheets.
          </p>
        </div>
      )}

      {/* Nepal Report Card Preview Modal */}
      {previewOpen &&
        (previewLoading ? (
          <div className="loading-overlay">
            <div className="loading-modal">
              <Loader2 className="spin" size={48} />
              <p>Loading Report Card...</p>
              <button className="btn btn-outline" onClick={closePreview}>
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        ) : previewData ? (
          previewData.isNEBClass ? (
            <NEBGradeSheet
              data={previewData}
              onClose={closePreview}
              showActions={true}
            />
          ) : (
            <NepalReportCard
              data={previewData}
              onClose={closePreview}
              showActions={true}
            />
          )
        ) : null)}

      {/* Bulk Print Modal */}
      {bulkPrintOpen && (
        <BulkReportCardPrint
          data={bulkPrintData}
          onClose={closeBulkPrint}
          loading={bulkPrintLoading}
        />
      )}

      <style>{`
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .inline-icon {
          display: inline-block;
          vertical-align: middle;
          margin-right: 0.5rem;
        }
        .badge-success {
          background: #dcfce7;
          color: #166534;
        }
        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }
        .badge-secondary {
          background: #e2e8f0;
          color: #475569;
        }
        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .loading-modal {
          background: white;
          padding: 2rem 3rem;
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .loading-modal .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
        }
        .loading-modal .btn-outline {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }
      `}</style>
    </div>
  );
};

export default ReportCards;
