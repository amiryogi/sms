import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Select, Button } from '../../components/common/FormElements';
import { Check, X, Clock, AlertCircle, Save } from 'lucide-react';
import { attendanceService } from '../../api/attendanceService';
import { teacherService } from '../../api/teacherService';
import { studentService } from '../../api/studentService';

const Attendance = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ classId: '', sectionId: '', date: new Date().toISOString().split('T')[0] });
  const [existingAttendance, setExistingAttendance] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (filters.classId && filters.sectionId && filters.date) {
      fetchStudentsAndAttendance();
    }
  }, [filters]);

  const fetchAssignments = async () => {
    try {
      const response = await teacherService.getTeacherAssignments({ userId: user?.id });
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      // Fetch students for the class/section
      const studentsRes = await studentService.getStudents({
        classId: filters.classId,
        sectionId: filters.sectionId,
      });
      const studentList = studentsRes.data?.students || studentsRes.data || [];
      setStudents(studentList);

      // Fetch existing attendance
      const attendanceRes = await attendanceService.getAttendance({
        classId: filters.classId,
        sectionId: filters.sectionId,
        date: filters.date,
      });
      const existing = attendanceRes.data || [];
      setExistingAttendance(existing);

      // Initialize attendance records
      const records = studentList.map(student => {
        const existingRecord = existing.find(a => a.studentId === student.id);
        return {
          studentId: student.id,
          studentName: `${student.user?.firstName} ${student.user?.lastName}`,
          status: existingRecord?.status || 'present',
          remarks: existingRecord?.remarks || '',
        };
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setAttendanceRecords(prev =>
      prev.map(r => r.studentId === studentId ? { ...r, status } : r)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await attendanceService.markAttendance({
        classId: parseInt(filters.classId),
        sectionId: parseInt(filters.sectionId),
        date: filters.date,
        attendanceRecords: attendanceRecords.map(r => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks,
        })),
      });
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(error.response?.data?.message || 'Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  // Get unique class/section combinations from assignments
  const classSectionOptions = [...new Map(
    assignments.map(a => [`${a.classSubject?.classId}-${a.sectionId}`, {
      classId: a.classSubject?.classId,
      sectionId: a.sectionId,
      label: `${a.classSubject?.class?.name} - ${a.section?.name}`,
    }])
  ).values()];

  const statusButtons = [
    { status: 'present', icon: Check, label: 'P', color: 'success' },
    { status: 'absent', icon: X, label: 'A', color: 'danger' },
    { status: 'late', icon: Clock, label: 'L', color: 'warning' },
    { status: 'excused', icon: AlertCircle, label: 'E', color: 'info' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Mark Attendance</h1>
          <p className="text-muted">Record daily attendance for your assigned classes</p>
        </div>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <div className="form-group">
            <label>Class - Section</label>
            <select
              value={filters.classId ? `${filters.classId}-${filters.sectionId}` : ''}
              onChange={(e) => {
                const [classId, sectionId] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, classId, sectionId }));
              }}
            >
              <option value="">Select Class</option>
              {classSectionOptions.map((opt, i) => (
                <option key={i} value={`${opt.classId}-${opt.sectionId}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      {filters.classId && filters.sectionId && (
        <div className="card">
          {loading ? (
            <div className="text-center">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-muted text-center">No students found in this class.</div>
          ) : (
            <>
              <div className="attendance-header">
                <span>Student</span>
                <span>Status</span>
              </div>
              <div className="attendance-list">
                {attendanceRecords.map((record) => (
                  <div key={record.studentId} className="attendance-row">
                    <span className="student-name">{record.studentName}</span>
                    <div className="status-buttons">
                      {statusButtons.map((btn) => (
                        <button
                          key={btn.status}
                          className={`status-btn status-${btn.color} ${record.status === btn.status ? 'active' : ''}`}
                          onClick={() => updateStatus(record.studentId, btn.status)}
                          title={btn.status}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="attendance-actions">
                <Button icon={Save} loading={saving} onClick={handleSave}>
                  Save Attendance
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
