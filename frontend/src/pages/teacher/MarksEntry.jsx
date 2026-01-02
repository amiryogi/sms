import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Select, Button } from '../../components/common/FormElements';
import { Save } from 'lucide-react';
import { examService } from '../../api/examService';
import { teacherService } from '../../api/teacherService';

const MarksEntry = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ examId: '', classSubjectId: '', sectionId: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.examId && filters.classSubjectId && filters.sectionId) {
      fetchStudentsAndMarks();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [examsRes, assignmentsRes] = await Promise.all([
        examService.getTeacherExams(),
        teacherService.getTeacherAssignments({ userId: user?.id }),
      ]);
      // Filter out only PUBLISHED exams (backend should handle this, but safety first)
      const publishedExams = (examsRes.data || []).filter(e => e.status === 'PUBLISHED');
      setExams(publishedExams);
      setTeacherAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      // Find the class ID from the assignment
      const assignment = teacherAssignments.find(a =>
        a.classSubjectId?.toString() === filters.classSubjectId &&
        a.sectionId?.toString() === filters.sectionId
      );

      if (!assignment) return;

      // Fetch students and existing marks together via new API
      try {
        // Find exam subject ID
        const exam = exams.find(e => e.id?.toString() === filters.examId);
        const examSubject = exam?.examSubjects?.find(es =>
          es.classSubjectId?.toString() === filters.classSubjectId
        );

        if (examSubject) {
          // Get existing results or student list for entry
          let marks = [];

          try {
            // Try fetching existing results first
            const resultsRes = await examService.getResultsBySubject(examSubject.id, filters.sectionId);
            const { results } = resultsRes.data;

            if (results && results.length > 0) {
              marks = results.map(r => ({
                studentId: r.student.id,
                studentName: `${r.student.user?.firstName} ${r.student.user?.lastName}`,
                marksObtained: r.isAbsent ? '' : (r.marksObtained || ''),
                practicalMarks: r.isAbsent ? '' : (r.practicalMarks || ''),
                isAbsent: r.isAbsent || false,
                remarks: r.remarks || '',
              }));
            }
          } catch (err) {
            // If 404 or no results, we'll fetch student list next
          }

          // If no existing marks, fetch students for initial entry
          if (marks.length === 0) {
            const studentsRes = await examService.getStudentsForMarksEntry(examSubject.id, filters.sectionId);
            const studentList = studentsRes.data?.students || [];

            marks = studentList.map(s => ({
              studentId: s.studentId,
              studentName: `${s.firstName} ${s.lastName}`,
              marksObtained: '',
              practicalMarks: '',
              isAbsent: false,
              remarks: '',
            }));
          }

          setMarksData(marks);
        }
      } catch (error) {
        console.error('Error fetching marks data:', error);
        setMarksData([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMarks = (studentId, field, value) => {
    setMarksData(prev =>
      prev.map(m => m.studentId === studentId ? { ...m, [field]: value } : m)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const exam = exams.find(e => e.id?.toString() === filters.examId);
      const examSubject = exam?.examSubjects?.find(es =>
        es.classSubjectId?.toString() === filters.classSubjectId
      );

      if (!examSubject) {
        alert('Exam subject not found. Please ensure the exam includes this subject.');
        return;
      }

      await examService.saveResults({
        examSubjectId: examSubject.id,
        sectionId: parseInt(filters.sectionId),
        results: marksData
          .filter(m => (m.marksObtained !== '' || m.isAbsent)) // Send only entered data
          .map(m => ({
            studentId: m.studentId,
            marksObtained: m.isAbsent ? 0 : parseFloat(m.marksObtained),
            practicalMarks: m.isAbsent ? 0 : parseFloat(m.practicalMarks),
            isAbsent: m.isAbsent,
            remarks: m.remarks,
          })),
      });
      alert('Marks saved successfully!');
    } catch (error) {
      console.error('Error saving marks:', error);
      alert(error.response?.data?.message || 'Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  const examOptions = exams.map(e => ({ value: e.id.toString(), label: e.name }));

  const classSubjectSectionOptions = teacherAssignments.map(ta => ({
    value: `${ta.classSubjectId}-${ta.sectionId}`,
    label: `${ta.classSubject?.class?.name} ${ta.section?.name} - ${ta.classSubject?.subject?.name}`,
  }));

  const selectedExam = exams.find(e => e.id?.toString() === filters.examId);
  /* Find the specific exam subject to get max marks config */
  const currentExamSubject = selectedExam?.examSubjects?.find(es =>
    es.classSubjectId?.toString() === filters.classSubjectId
  );

  const theoryMax = currentExamSubject?.theoryFullMarks || 100;
  const practicalMax = currentExamSubject?.practicalFullMarks || 0;
  const hasPractical = practicalMax > 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Marks Entry</h1>
          <p className="text-muted">Enter exam marks for your assigned subjects</p>
        </div>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <Select
            label="Exam"
            name="examId"
            options={examOptions}
            value={filters.examId}
            onChange={(e) => setFilters(prev => ({ ...prev, examId: e.target.value }))}
            placeholder="Select Exam"
          />
          <div className="form-group">
            <label>Class - Section - Subject</label>
            <select
              value={filters.classSubjectId ? `${filters.classSubjectId}-${filters.sectionId}` : ''}
              onChange={(e) => {
                const [classSubjectId, sectionId] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, classSubjectId, sectionId }));
              }}
            >
              <option value="">Select...</option>
              {classSubjectSectionOptions.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filters.examId && filters.classSubjectId && (
        <div className="card">
          {loading ? (
            <div className="text-center">Loading students...</div>
          ) : marksData.length === 0 ? (
            <div className="text-muted text-center">No students found.</div>
          ) : (
            <>
              <div className="marks-header">
                <span>Student</span>
                <span>Theory (Max: {theoryMax})</span>
                {hasPractical && <span>Practical (Max: {practicalMax})</span>}
                <span>Remarks</span>
              </div>
              <div className="marks-list">
                {marksData.map((record) => (
                  <div key={record.studentId} className="marks-row">
                    <span className="student-name">{record.studentName}</span>
                    <input
                      type="number"
                      value={record.marksObtained}
                      onChange={(e) => updateMarks(record.studentId, 'marksObtained', e.target.value)}
                      min="0"
                      max={theoryMax}
                      className="marks-input"
                      disabled={record.isAbsent}
                    />
                    {hasPractical && (
                      <input
                        type="number"
                        value={record.practicalMarks}
                        onChange={(e) => updateMarks(record.studentId, 'practicalMarks', e.target.value)}
                        min="0"
                        max={practicalMax}
                        className="marks-input"
                        disabled={record.isAbsent}
                        placeholder="Prac."
                      />
                    )}
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={record.isAbsent}
                        onChange={(e) => updateMarks(record.studentId, 'isAbsent', e.target.checked)}
                      /> Absent
                    </label>
                    <input
                      type="text"
                      value={record.remarks}
                      onChange={(e) => updateMarks(record.studentId, 'remarks', e.target.value)}
                      placeholder="Remarks"
                      className="remarks-input"
                    />
                  </div>
                ))}
              </div>
              <div className="marks-actions">
                <Button icon={Save} loading={saving} onClick={handleSave}>
                  Save Marks
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MarksEntry;
