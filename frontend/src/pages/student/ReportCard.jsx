import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Select, Button } from '../../components/common/FormElements';
import { Printer, Download } from 'lucide-react';
import { examService } from '../../api/examService';

const ReportCard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchReportCard();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const response = await examService.getExams();
      const publishedExams = (response.data || []).filter(e => e.isPublished);
      setExams(publishedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      const studentId = user?.student?.id;
      if (!studentId) return;
      
      const response = await examService.getReportCard(studentId, selectedExam);
      setReportCard(response.data);
    } catch (error) {
      console.error('Error fetching report card:', error);
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const examOptions = exams.map(e => ({ value: e.id.toString(), label: e.name }));

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <h1>Report Card</h1>
          <p className="text-muted">View and print your report card</p>
        </div>
      </div>

      <div className="card filter-card no-print">
        <div className="filter-row">
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
              Print Report Card
            </Button>
          )}
        </div>
      </div>

      {selectedExam && (
        <div className="card report-card-container">
          {loading ? (
            <div className="text-center">Loading report card...</div>
          ) : !reportCard ? (
            <div className="text-muted text-center">Report card not available for this exam.</div>
          ) : (
            <div className="report-card printable">
              <div className="report-header">
                <h2>{user?.school?.name || 'School Name'}</h2>
                <h3>Report Card</h3>
                <p>{reportCard.exam?.name} - {reportCard.exam?.academicYear?.name}</p>
              </div>

              <div className="student-info">
                <div className="info-row">
                  <span>Student Name:</span>
                  <strong>{user?.firstName} {user?.lastName}</strong>
                </div>
                <div className="info-row">
                  <span>Class:</span>
                  <strong>{reportCard.class?.name} - {reportCard.section?.name}</strong>
                </div>
                <div className="info-row">
                  <span>Roll Number:</span>
                  <strong>{user?.student?.rollNumber || 'N/A'}</strong>
                </div>
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks Obtained</th>
                    <th>Max Marks</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.results?.map((result, i) => (
                    <tr key={i}>
                      <td>{result.subject?.name || 'Subject'}</td>
                      <td>{result.marksObtained}</td>
                      <td>{result.maxMarks}</td>
                      <td>{result.grade}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td><strong>Total</strong></td>
                    <td><strong>{reportCard.totalMarks}</strong></td>
                    <td><strong>{reportCard.maxTotalMarks}</strong></td>
                    <td><strong>{reportCard.overallGrade}</strong></td>
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
                  <strong>{reportCard.classRank || 'N/A'}</strong>
                </div>
                <div className="summary-item">
                  <span>Result:</span>
                  <strong className={reportCard.isPassed ? 'text-success' : 'text-danger'}>
                    {reportCard.isPassed ? 'PASSED' : 'FAILED'}
                  </strong>
                </div>
              </div>

              {reportCard.remarks && (
                <div className="report-remarks">
                  <strong>Remarks:</strong> {reportCard.remarks}
                </div>
              )}

              <div className="report-footer">
                <div className="signature">
                  <div className="line"></div>
                  <span>Class Teacher</span>
                </div>
                <div className="signature">
                  <div className="line"></div>
                  <span>Principal</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportCard;
