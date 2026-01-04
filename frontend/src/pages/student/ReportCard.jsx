import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Select, Button } from '../../components/common/FormElements';
import { Printer, Download, FileText, Award, Loader2 } from 'lucide-react';
import NepalReportCard from '../../components/common/NepalReportCard';
import { reportCardService } from '../../api/reportCardService';

const ReportCard = () => {
  const { user } = useAuth();
  const [publishedExams, setPublishedExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [reportCardData, setReportCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);

  // Get student ID from auth context
  const studentId = user?.student?.id;

  useEffect(() => {
    if (studentId) {
      fetchPublishedExams();
    }
  }, [studentId]);

  useEffect(() => {
    if (selectedExam && studentId) {
      fetchReportCard();
    }
  }, [selectedExam, studentId]);

  const fetchPublishedExams = async () => {
    setLoadingExams(true);
    try {
      const response = await reportCardService.getStudentPublishedExams(studentId);
      setPublishedExams(response.data || []);
    } catch (error) {
      console.error('Error fetching published exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      const response = await reportCardService.getReportCard(studentId, selectedExam);
      setReportCardData(response.data);
    } catch (error) {
      console.error('Error fetching report card:', error);
      setReportCardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const examOptions = publishedExams.map(e => ({
    value: e.examId.toString(),
    label: `${e.examName} - ${e.academicYear} (Grade: ${e.overallGrade})`,
  }));

  // Get selected exam info
  const selectedExamInfo = publishedExams.find(e => e.examId.toString() === selectedExam);

  // GPA color helper
  const getGpaColor = (gpa) => {
    if (!gpa) return { bg: '#f3f4f6', text: '#6b7280' };
    if (gpa >= 3.6) return { bg: '#dcfce7', text: '#166534' };
    if (gpa >= 2.8) return { bg: '#dbeafe', text: '#1e40af' };
    if (gpa >= 2.0) return { bg: '#fef3c7', text: '#92400e' };
    if (gpa >= 1.6) return { bg: '#fed7aa', text: '#9a3412' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <h1><FileText className="inline-icon" /> My Report Card</h1>
          <p className="text-muted">View and download your Nepal-style grade sheet</p>
        </div>
      </div>

      {/* Exam Selection Card */}
      <div className="card filter-card no-print" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-row" style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <Select
              label="Select Examination"
              name="examId"
              options={examOptions}
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              placeholder={loadingExams ? "Loading exams..." : "Choose an exam..."}
              disabled={loadingExams || publishedExams.length === 0}
            />
          </div>
          {reportCardData && (
            <Button onClick={handlePrint} icon={Printer}>
              Print / Download PDF
            </Button>
          )}
        </div>

        {publishedExams.length === 0 && !loadingExams && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
            <strong>No published report cards available.</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              Report cards will appear here once your school publishes them.
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats for Selected Exam */}
      {selectedExamInfo && !loading && (
        <div className="card no-print" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'space-around' }}>
            <div className="stat-item">
              <FileText size={24} style={{ color: '#3b82f6' }} />
              <div>
                <div className="stat-label">Examination</div>
                <div className="stat-value">{selectedExamInfo.examName}</div>
              </div>
            </div>
            <div className="stat-item">
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}></div>
              <div>
                <div className="stat-label">Academic Year</div>
                <div className="stat-value">{selectedExamInfo.academicYear}</div>
              </div>
            </div>
            <div className="stat-item">
              <Award size={24} style={{ color: '#eab308' }} />
              <div>
                <div className="stat-label">Class Rank</div>
                <div className="stat-value">#{selectedExamInfo.classRank || 'N/A'}</div>
              </div>
            </div>
            <div className="stat-item" style={{ background: getGpaColor(reportCardData?.summary?.gpa).bg, padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
              <div>
                <div className="stat-label">Final GPA</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: getGpaColor(reportCardData?.summary?.gpa).text }}>
                  {reportCardData?.summary?.gpa?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <div className="stat-label">Grade</div>
                <div 
                  className="stat-value" 
                  style={{ 
                    background: getGpaColor(reportCardData?.summary?.gpa).bg,
                    color: getGpaColor(reportCardData?.summary?.gpa).text,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '1.25rem'
                  }}
                >
                  {selectedExamInfo.overallGrade}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 className="spin" size={48} style={{ margin: '0 auto', color: '#3b82f6' }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading your report card...</p>
        </div>
      )}

      {/* No Selection State */}
      {!selectedExam && !loading && publishedExams.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText size={64} style={{ margin: '0 auto', opacity: 0.2 }} />
          <h3 style={{ marginTop: '1rem' }}>Select an Examination</h3>
          <p className="text-muted">Choose an exam from the dropdown above to view your report card.</p>
        </div>
      )}

      {/* Report Card Display */}
      {selectedExam && !loading && reportCardData && (
        <NepalReportCard
          data={reportCardData}
          showActions={false}
        />
      )}

      {/* Error State */}
      {selectedExam && !loading && !reportCardData && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
          <h3>Report Card Not Available</h3>
          <p className="text-muted">
            The report card for this examination is not available yet.
            Please contact your school administration.
          </p>
        </div>
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

        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }
          .page-container {
            padding: 0;
            margin: 0;
          }
        }

        /* Override report card overlay for embedded view */
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

export default ReportCard;
