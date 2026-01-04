import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select, Button } from "../../components/common/FormElements";
import {
  Printer,
  FileText,
  Award,
  Loader2,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import NepalReportCard from "../../components/common/NepalReportCard";
import { reportCardService } from "../../api/reportCardService";
import { parentService } from "../../api/parentService";

const ParentReportCard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [publishedExams, setPublishedExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [reportCardData, setReportCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [error, setError] = useState(null);

  // Fetch children on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch exams when child is selected
  useEffect(() => {
    if (selectedChild) {
      fetchPublishedExams();
      setSelectedExam("");
      setReportCardData(null);
    }
  }, [selectedChild]);

  // Fetch report card when exam is selected
  useEffect(() => {
    if (selectedExam && selectedChild) {
      fetchReportCard();
    }
  }, [selectedExam, selectedChild]);

  const fetchChildren = async () => {
    setLoadingChildren(true);
    setError(null);
    try {
      // Use the dedicated parent endpoint
      const response = await parentService.getMyChildren();
      const childList = response.data?.children || response.children || [];
      setChildren(childList);
      // Auto-select if only one child
      if (childList.length === 1) {
        setSelectedChild(childList[0].id.toString());
      }
    } catch (err) {
      console.error("Error fetching children:", err);
      setError(err.response?.data?.message || "Failed to load children");
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchPublishedExams = async () => {
    setLoadingExams(true);
    try {
      const response = await reportCardService.getStudentPublishedExams(
        selectedChild
      );
      setPublishedExams(response.data || []);
    } catch (error) {
      console.error("Error fetching published exams:", error);
      setPublishedExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      const response = await reportCardService.getReportCard(
        selectedChild,
        selectedExam
      );
      setReportCardData(response.data);
    } catch (error) {
      console.error("Error fetching report card:", error);
      setReportCardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Map children options using flat structure from API
  const childOptions = children.map((c) => ({
    value: c.id.toString(),
    label: `${c.firstName} ${c.lastName} (${
      c.currentEnrollment?.class?.name ||
      c.enrollments?.[0]?.class?.name ||
      "N/A"
    })`,
  }));

  const examOptions = publishedExams.map((e) => ({
    value: e.examId.toString(),
    label: `${e.examName} - ${e.academicYear} (Grade: ${e.overallGrade})`,
  }));

  // Get selected info using flat structure
  const selectedChildInfo = children.find(
    (c) => c.id.toString() === selectedChild
  );
  const selectedExamInfo = publishedExams.find(
    (e) => e.examId.toString() === selectedExam
  );

  // GPA color helper
  const getGpaColor = (gpa) => {
    if (!gpa) return { bg: "#f3f4f6", text: "#6b7280" };
    if (gpa >= 3.6) return { bg: "#dcfce7", text: "#166534" };
    if (gpa >= 2.8) return { bg: "#dbeafe", text: "#1e40af" };
    if (gpa >= 2.0) return { bg: "#fef3c7", text: "#92400e" };
    if (gpa >= 1.6) return { bg: "#fed7aa", text: "#9a3412" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  if (loadingChildren) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="text-center">
            <Loader2 className="spinning" size={32} />
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
            <button className="btn btn-primary" onClick={fetchChildren}>
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
          <h1>
            <FileText className="inline-icon" /> Child's Report Card
          </h1>
          <p className="text-muted">
            View and download your child's Nepal-style grade sheet
          </p>
        </div>
      </div>

      {/* Selection Card */}
      <div
        className="card filter-card no-print"
        style={{ marginBottom: "1.5rem" }}
      >
        <div
          className="filter-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          <Select
            label="Select Child"
            name="childId"
            options={childOptions}
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            placeholder={loadingChildren ? "Loading..." : "Choose a child..."}
            disabled={loadingChildren || children.length === 0}
          />
          <Select
            label="Select Examination"
            name="examId"
            options={examOptions}
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            placeholder={
              loadingExams ? "Loading exams..." : "Choose an exam..."
            }
            disabled={
              !selectedChild || loadingExams || publishedExams.length === 0
            }
          />
          {reportCardData && (
            <Button onClick={handlePrint} icon={Printer}>
              Print / Download PDF
            </Button>
          )}
        </div>

        {selectedChild && publishedExams.length === 0 && !loadingExams && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#fef3c7",
              borderRadius: "8px",
              color: "#92400e",
            }}
          >
            <strong>No published report cards available for this child.</strong>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
              Report cards will appear here once the school publishes them.
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {selectedExamInfo && !loading && reportCardData && (
        <div className="card no-print" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
              justifyContent: "space-around",
            }}
          >
            <div className="stat-item">
              <Users size={24} style={{ color: "#3b82f6" }} />
              <div>
                <div className="stat-label">Student</div>
                <div className="stat-value">
                  {reportCardData?.student?.name}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <FileText size={24} style={{ color: "#8b5cf6" }} />
              <div>
                <div className="stat-label">Examination</div>
                <div className="stat-value">{selectedExamInfo.examName}</div>
              </div>
            </div>
            <div className="stat-item">
              <Award size={24} style={{ color: "#eab308" }} />
              <div>
                <div className="stat-label">Class Rank</div>
                <div className="stat-value">
                  #{selectedExamInfo.classRank || "N/A"}
                </div>
              </div>
            </div>
            <div
              className="stat-item"
              style={{
                background: getGpaColor(reportCardData?.summary?.gpa).bg,
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
              }}
            >
              <div>
                <div className="stat-label">Final GPA</div>
                <div
                  className="stat-value"
                  style={{
                    fontSize: "1.5rem",
                    color: getGpaColor(reportCardData?.summary?.gpa).text,
                  }}
                >
                  {reportCardData?.summary?.gpa?.toFixed(2) || "N/A"}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <div className="stat-label">Result</div>
                <div
                  className="stat-value"
                  style={{
                    background: reportCardData?.summary?.isPassed
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: reportCardData?.summary?.isPassed
                      ? "#166534"
                      : "#991b1b",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                  }}
                >
                  {reportCardData?.summary?.isPassed ? "PASSED" : "FAILED"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Loader2
            className="spin"
            size={48}
            style={{ margin: "0 auto", color: "#3b82f6" }}
          />
          <p style={{ marginTop: "1rem", color: "#64748b" }}>
            Loading report card...
          </p>
        </div>
      )}

      {/* No Selection State */}
      {!selectedChild && !loadingChildren && children.length > 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={64} style={{ margin: "0 auto", opacity: 0.2 }} />
          <h3 style={{ marginTop: "1rem" }}>Select a Child</h3>
          <p className="text-muted">
            Choose your child from the dropdown to view their report cards.
          </p>
        </div>
      )}

      {/* No Children State */}
      {!loadingChildren && children.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={64} style={{ margin: "0 auto", opacity: 0.2 }} />
          <h3 style={{ marginTop: "1rem" }}>No Children Found</h3>
          <p className="text-muted">
            No children are linked to your account. Please contact the school
            administration.
          </p>
        </div>
      )}

      {/* Report Card Display */}
      {selectedExam && !loading && reportCardData && (
        <NepalReportCard data={reportCardData} showActions={false} />
      )}

      <style>{`
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .stat-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
        }
        .inline-icon {
          display: inline-block;
          vertical-align: middle;
          margin-right: 0.5rem;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .page-container {
            padding: 0;
            margin: 0;
          }
        }

        .report-card-overlay {
          position: static !important;
          background: none !important;
          padding: 0 !important;
        }
        .report-actions {
          display: none !important;
        }
        .report-card-container {
          display: block !important;
        }
        .report-card-a4 {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default ParentReportCard;
