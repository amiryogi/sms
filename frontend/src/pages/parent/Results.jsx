import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select, Button } from "../../components/common/FormElements";
import { Award, Printer, RefreshCw, AlertCircle } from "lucide-react";
import { examService } from "../../api/examService";
import { parentService } from "../../api/parentService";

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
      const response = await examService.getExams();
      // Filter for published exams (status === 'PUBLISHED')
      const publishedExams = (response.data || []).filter(
        (e) => e.status === "PUBLISHED"
      );
      setExams(publishedExams);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      // Use studentId from the child object
      const response = await examService.getReportCard(
        selectedChild.id,
        selectedExam
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

  const examOptions = exams.map((e) => ({
    value: e.id.toString(),
    label: e.name,
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
                <h2>{user?.school?.name || "School Name"}</h2>
                <h3>Report Card</h3>
                <p>{reportCard.exam?.name}</p>
              </div>

              <div className="student-info">
                <div className="info-row">
                  <span>Student Name:</span>
                  <strong>
                    {selectedChild?.firstName} {selectedChild?.lastName}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Class:</span>
                  <strong>
                    {reportCard.class?.name ||
                      getEnrollment(selectedChild)?.class?.name}{" "}
                    -{" "}
                    {reportCard.section?.name ||
                      getEnrollment(selectedChild)?.section?.name}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Roll Number:</span>
                  <strong>{selectedChild?.rollNumber || "N/A"}</strong>
                </div>
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Max</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.results?.map((result, i) => (
                    <tr key={i}>
                      <td>{result.subject?.name}</td>
                      <td>{result.marksObtained}</td>
                      <td>{result.maxMarks}</td>
                      <td>{result.grade}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>{reportCard.totalMarks}</strong>
                    </td>
                    <td>
                      <strong>{reportCard.maxTotalMarks}</strong>
                    </td>
                    <td>
                      <strong>{reportCard.overallGrade}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="report-summary">
                <div className="summary-item">
                  <span>Percentage:</span>
                  <strong>{reportCard.percentage}%</strong>
                </div>
                <div className="summary-item">
                  <span>Rank:</span>
                  <strong>{reportCard.classRank || "N/A"}</strong>
                </div>
                <div className="summary-item">
                  <span>Result:</span>
                  <strong
                    className={
                      reportCard.isPassed ? "text-success" : "text-danger"
                    }
                  >
                    {reportCard.isPassed ? "PASSED" : "FAILED"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
