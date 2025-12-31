import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import { BookOpen, ClipboardList, Users, Calendar } from 'lucide-react';
import { teacherService } from '../../api/teacherService';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await teacherService.getTeacherAssignments({ userId: user?.id });
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes and subjects
  const uniqueClasses = [...new Set(assignments.map(a => a.classSubject?.class?.name).filter(Boolean))];
  const uniqueSubjects = [...new Set(assignments.map(a => a.classSubject?.subject?.name).filter(Boolean))];

  return (
    <div className="teacher-dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.firstName}!</h1>
          <p className="text-muted">Teacher Dashboard</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Assigned Classes"
          value={loading ? '...' : uniqueClasses.length}
          icon={BookOpen}
          color="primary"
        />
        <StatCard
          title="Subjects Teaching"
          value={loading ? '...' : uniqueSubjects.length}
          icon={ClipboardList}
          color="success"
        />
        <StatCard
          title="Total Assignments"
          value={loading ? '...' : assignments.length}
          icon={Calendar}
          color="warning"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>My Class Assignments</h3>
          {loading ? (
            <p>Loading...</p>
          ) : assignments.length === 0 ? (
            <p className="text-muted">No class assignments found.</p>
          ) : (
            <div className="assignments-list">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="assignment-item">
                  <div className="assignment-info">
                    <strong>{assignment.classSubject?.class?.name} - {assignment.section?.name}</strong>
                    <span>{assignment.classSubject?.subject?.name}</span>
                  </div>
                  {assignment.isClassTeacher && (
                    <span className="badge badge-primary">Class Teacher</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <a href="/teacher/attendance" className="action-btn">
              <ClipboardList size={20} />
              <span>Mark Attendance</span>
            </a>
            <a href="/teacher/assignments" className="action-btn">
              <Calendar size={20} />
              <span>Manage Assignments</span>
            </a>
            <a href="/teacher/marks" className="action-btn">
              <BookOpen size={20} />
              <span>Enter Marks</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
