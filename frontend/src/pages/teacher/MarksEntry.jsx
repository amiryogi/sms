import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Select, Button } from '../../components/common/FormElements';
import { Save } from 'lucide-react';
import { examService } from '../../api/examService';
import { teacherService } from '../../api/teacherService';
import { studentService } from '../../api/studentService';

const MarksEntry = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [students, setStudents] = useState([]);
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
        examService.getExams(),
        teacherService.getTeacherAssignments({ userId: user?.id }),
      ]);
      setExams(examsRes.data || []);
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

      // Fetch students
      const studentsRes = await studentService.getStudents({
        classId: assignment.classSubject?.classId,
        sectionId: filters.sectionId,
      });
      const studentList = studentsRes.data?.students || studentsRes.data || [];
      setStudents(studentList);

      // Try to fetch existing marks
      try {
        // Find exam subject ID
        const exam = exams.find(e => e.id?.toString() === filters.examId);
        const examSubject = exam?.examSubjects?.find(es => 
          es.classSubjectId?.toString() === filters.classSubjectId
        );

        if (examSubject) {
          const resultsRes = await examService.getResultsBySubject(examSubject.id);
          const existingMarks = resultsRes.data || [];
          
          const marks = studentList.map(student => {
            const existing = existingMarks.find(m => m.studentId === student.id);
            return {
              studentId: student.id,
              studentName: `${student.user?.firstName} ${student.user?.lastName}`,
              marksObtained: existing?.marksObtained || '',
              remarks: existing?.remarks || '',
            };
          });
          setMarksData(marks);
        } else {
          // No exam subject found, initialize empty
          const marks = studentList.map(student => ({
            studentId: student.id,
            studentName: `${student.user?.firstName} ${student.user?.lastName}`,
            marksObtained: '',
            remarks: '',
          }));
          setMarksData(marks);
        }
      } catch (error) {
        // Initialize empty marks
        const marks = studentList.map(student => ({
          studentId: student.id,
          studentName: `${student.user?.firstName} ${student.user?.lastName}`,
          marksObtained: '',
          remarks: '',
        }));
        setMarksData(marks);
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
        results: marksData
          .filter(m => m.marksObtained !== '')
          .map(m => ({
            studentId: m.studentId,
            marksObtained: parseFloat(m.marksObtained),
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
  const maxMarks = selectedExam?.examSubjects?.find(es => 
    es.classSubjectId?.toString() === filters.classSubjectId
  )?.maxMarks || 100;

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
          ) : students.length === 0 ? (
            <div className="text-muted text-center">No students found.</div>
          ) : (
            <>
              <div className="marks-header">
                <span>Student</span>
                <span>Marks (Max: {maxMarks})</span>
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
                      max={maxMarks}
                      className="marks-input"
                    />
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
