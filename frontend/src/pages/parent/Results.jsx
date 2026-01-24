import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select, Button } from "../../components/common/FormElements";
import { Award, Printer, RefreshCw, AlertCircle, X } from "lucide-react";
import { examService } from "../../api/examService";
import { parentService } from "../../api/parentService";
import NEBGradeSheet from "../../components/common/NEBGradeSheet";
import NepalReportCard from "../../components/common/NepalReportCard";

const Results = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [error, setError] = useState(null);
  const [showFullReportCard, setShowFullReportCard] = useState(false);

  // Fetch children from dedicated endpoint
  const loadChildren = async () => {
    setLoadingChildren(true);
    setError(null);
    try {
      const response = await parentService.getMyChildren();
      const childList = response.data?.children || response.children || [];
      setChildren(childList);
      if (childList.length > 0 && !selectedChild) {
        setSelectedChild(childList[0]);
      }
    } catch (err) {
      console.error("Error loading children:", err);
      setError(err.response?.data?.message || "Failed to load children");
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchExams();
    }
  }, [selectedChild]);

  useEffect(() => {
    if (selectedChild && selectedExam) {
      fetchReportCard();
    }
  }, [selectedChild, selectedExam]);

  const fetchExams = async () => {
    try {
      // Fetch exams that have PUBLISHED report cards for this student
      const response = await examService.getStudentPublishedExams(
        selectedChild.id,
      );
      setExams(response.data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
      setExams([]);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      // Use studentId from the child object
      const response = await examService.getReportCard(
        selectedChild.id,
        selectedExam,
      );
      setReportCard(response.data);
    } catch (error) {
      console.error("Error fetching report card:", error);
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (e) => {
    const childId = parseInt(e.target.value);
    const child = children.find((c) => c.id === childId);
    setSelectedChild(child);
    setSelectedExam("");
    setReportCard(null);
  };

  const handlePrint = () => {
    window.print();
  };

  // Map children to options using flat structure
  const childOptions = children.map((c) => ({
    value: c.id.toString(),
    label: `${c.firstName} ${c.lastName}`,
  }));

  // Exams from getStudentPublishedExams have examId, examName, etc.
  const examOptions = exams.map((e) => ({
    value: (e.examId || e.id).toString(),
    label: `${e.examName || e.name} (${e.academicYear || ""})`,
  }));

  // Helper to get enrollment
  const getEnrollment = (child) => {
    return child?.currentEnrollment || child?.enrollments?.[0] || null;
  };

  if (loadingChildren) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="text-center">
            <RefreshCw className="spinning" size={32} />
            <p>Loading children data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="text-center text-danger">
            <AlertCircle size={48} />
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadChildren}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <h1>Results & Report Card</h1>
          <p className="text-muted">View your child's exam results</p>
        </div>
      </div>

      <div className="card filter-card no-print">
        <div className="filter-row">
          {children.length > 1 && (
            <Select
              label="Select Child"
              name="childId"
              options={childOptions}
              value={selectedChild?.id?.toString() || ""}
              onChange={handleChildChange}
            />
          )}
          <Select
            label="Select Exam"
            name="examId"
            options={examOptions}
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            placeholder="Choose an exam..."
          />
          {reportCard && (
            <Button onClick={handlePrint} icon={Printer}>
              Print
            </Button>
          )}
          {reportCard && (
            <Button
              onClick={() => setShowFullReportCard(true)}
              variant="secondary"
            >
              View Full Grade Sheet
            </Button>
          )}
        </div>
      </div>

      {selectedExam && (
        <div className="card report-card-container">
          {loading ? (
            <div className="text-center">Loading results...</div>
          ) : !reportCard ? (
            <div className="text-muted text-center">
              Results not available for this exam.
            </div>
          ) : (
            <div className="report-card printable">
              <div className="report-header">
                <h2>
                  {reportCard.school?.name ||
                    user?.school?.name ||
                    "School Name"}
                </h2>
                <h3>Report Card</h3>
                <p>
                  {reportCard.examination?.name} -{" "}
                  {reportCard.examination?.academicYear}
                </p>
              </div>

              <div className="student-info">
                <div className="info-row">
                  <span>Student Name:</span>
                  <strong>
                    {reportCard.student?.name ||
                      `${selectedChild?.firstName} ${selectedChild?.lastName}`}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Class:</span>
                  <strong>
                    {reportCard.student?.class ||
                      getEnrollment(selectedChild)?.class?.name}{" "}
                    -{" "}
                    {reportCard.student?.section ||
                      getEnrollment(selectedChild)?.section?.name}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Roll Number:</span>
                  <strong>
                    {reportCard.student?.rollNumber ||
                      selectedChild?.rollNumber ||
                      "N/A"}
                  </strong>
                </div>
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Full Marks</th>
                    <th>Grade</th>
                    <th>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.subjects?.map((subject, i) => (
                    <tr key={i}>
                      <td>{subject.subjectName}</td>
                      <td>{subject.totalMarks}</td>
                      <td>{subject.totalFullMarks}</td>
                      <td>{subject.finalGrade}</td>
                      <td>{subject.finalGpa}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>{reportCard.summary?.totalMarks}</strong>
                    </td>
                    <td>
                      <strong>{reportCard.summary?.totalFullMarks}</strong>
                    </td>
                    <td>
                      <strong>{reportCard.summary?.grade}</strong>
                    </td>
                    <td>
                      <strong>{reportCard.summary?.gpa}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="report-summary">
                <div className="summary-item">
                  <span>Percentage:</span>
                  <strong>{reportCard.summary?.percentage}%</strong>
                </div>
                <div className="summary-item">
                  <span>GPA:</span>
                  <strong>{reportCard.summary?.gpa}</strong>
                </div>
                <div className="summary-item">
                  <span>Rank:</span>
                  <strong>{reportCard.summary?.classRank || "N/A"}</strong>
                </div>
                <div className="summary-item">
                  <span>Result:</span>
                  <strong
                    className={
                      reportCard.summary?.isPassed
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {reportCard.summary?.isPassed ? "PASSED" : "FAILED"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Report Card Modal - Backend determines format via isNEBClass flag */}
      {showFullReportCard &&
        reportCard &&
        (reportCard.isNEBClass ? (
          <NEBGradeSheet
            data={reportCard}
            onClose={() => setShowFullReportCard(false)}
            showActions={true}
          />
        ) : (
          <NepalReportCard
            data={reportCard}
            onClose={() => setShowFullReportCard(false)}
            showActions={true}
          />
        ))}
    </div>
  );
};

export default Results;
