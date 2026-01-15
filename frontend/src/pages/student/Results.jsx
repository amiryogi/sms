import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select } from "../../components/common/FormElements";
import { Award, TrendingUp } from "lucide-react";
import { examService } from "../../api/examService";

const Results = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchResults();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const studentId = user?.student?.id;
      if (!studentId) return;

      // Fetch exams that have PUBLISHED report cards for this student
      const response = await examService.getStudentPublishedExams(studentId);
      setExams(response.data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
      setExams([]);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const studentId = user?.student?.id;
      if (!studentId) return;

      const response = await examService.getStudentExamResults(
        studentId,
        selectedExam
      );
      setResults(response.data || []);
    } catch (error) {
      console.error("Error fetching results:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const obtained = results.reduce(
      (sum, r) => sum + (r.marksObtained || 0),
      0
    );
    const max = results.reduce(
      (sum, r) => sum + (r.examSubject?.maxMarks || 0),
      0
    );
    const percentage = max > 0 ? ((obtained / max) * 100).toFixed(2) : 0;
    return { obtained, max, percentage };
  };

  const totals = calculateTotal();

  const getGrade = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "F";
  };

  // Exams from getStudentPublishedExams have examId, examName, etc.
  const examOptions = exams.map((e) => ({
    value: (e.examId || e.id).toString(),
    label: `${e.examName || e.name} (${e.academicYear || ""})`,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Results</h1>
          <p className="text-muted">View your exam results</p>
        </div>
      </div>

      <div className="card filter-card">
        <Select
          label="Select Exam"
          name="examId"
          options={examOptions}
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          placeholder="Choose an exam..."
        />
      </div>

      {selectedExam && (
        <div className="card">
          {loading ? (
            <div className="text-center">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="text-muted text-center">
              No results found for this exam.
            </div>
          ) : (
            <>
              <div className="results-summary">
                <div className="summary-card">
                  <Award size={24} />
                  <div>
                    <span className="summary-label">Total Score</span>
                    <span className="summary-value">
                      {totals.obtained} / {totals.max}
                    </span>
                  </div>
                </div>
                <div className="summary-card">
                  <TrendingUp size={24} />
                  <div>
                    <span className="summary-label">Percentage</span>
                    <span className="summary-value">{totals.percentage}%</span>
                  </div>
                </div>
                <div className="summary-card grade-card">
                  <div className="grade-badge">
                    {getGrade(totals.percentage)}
                  </div>
                  <span className="summary-label">Grade</span>
                </div>
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks Obtained</th>
                    <th>Max Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const pct = result.examSubject?.maxMarks
                      ? (
                          (result.marksObtained / result.examSubject.maxMarks) *
                          100
                        ).toFixed(1)
                      : 0;
                    return (
                      <tr key={result.id}>
                        <td>
                          {result.examSubject?.classSubject?.subject?.name ||
                            "Subject"}
                        </td>
                        <td>{result.marksObtained}</td>
                        <td>{result.examSubject?.maxMarks}</td>
                        <td>{pct}%</td>
                        <td>
                          <span
                            className={`grade-pill grade-${getGrade(
                              pct
                            ).toLowerCase()}`}
                          >
                            {getGrade(pct)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
