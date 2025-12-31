import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import { BookOpen, ClipboardList, Award, Calendar } from 'lucide-react';
import { assignmentService } from '../../api/assignmentService';
import { attendanceService } from '../../api/attendanceService';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assignments: 0,
    attendance: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [assignmentsRes] = await Promise.all([
        assignmentService.getAssignments(),
      ]);
      
      const assignments = assignmentsRes.data || [];
      setStats(prev => ({ ...prev, assignments: assignments.length }));
      setRecentAssignments(assignments.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollment = user?.student?.enrollments?.[0];

  return (
    <div className="student-dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.firstName}!</h1>
          <p className="text-muted">
            {enrollment 
              ? `${enrollment.class?.name} - Section ${enrollment.section?.name}` 
              : 'Student Dashboard'}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Pending Assignments"
          value={loading ? '...' : stats.assignments}
          icon={ClipboardList}
          color="primary"
        />
        <StatCard
          title="Current Class"
          value={enrollment?.class?.name || 'N/A'}
          icon={BookOpen}
          color="success"
        />
        <StatCard
          title="Roll Number"
          value={user?.student?.rollNumber || enrollment?.rollNumber || 'N/A'}
          icon={Award}
          color="info"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Recent Assignments</h3>
          {loading ? (
            <p>Loading...</p>
          ) : recentAssignments.length === 0 ? (
            <p className="text-muted">No assignments found.</p>
          ) : (
            <div className="assignments-list">
              {recentAssignments.map((assignment) => (
                <div key={assignment.id} className="assignment-item">
                  <div className="assignment-info">
                    <strong>{assignment.title}</strong>
                    <span>{assignment.classSubject?.subject?.name}</span>
                  </div>
                  <span className="due-date">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <a href="/student/assignments" className="view-all-link">View All Assignments →</a>
        </div>

        <div className="card">
          <h3>Quick Links</h3>
          <div className="quick-actions">
            <a href="/student/assignments" className="action-btn">
              <ClipboardList size={20} />
              <span>My Assignments</span>
            </a>
            <a href="/student/results" className="action-btn">
              <Award size={20} />
              <span>View Results</span>
            </a>
            <a href="/student/report-card" className="action-btn">
              <BookOpen size={20} />
              <span>Report Card</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
