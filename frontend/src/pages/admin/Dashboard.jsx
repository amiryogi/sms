import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import { 
  Users, GraduationCap, BookOpen, Calendar, 
  ClipboardList, Award, TrendingUp 
} from 'lucide-react';
import { studentService } from '../../api/studentService';
import { teacherService } from '../../api/teacherService';
import { academicService } from '../../api/academicService';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    subjects: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, subjectsRes, yearRes] = await Promise.all([
        studentService.getStudents({ limit: 1 }),
        teacherService.getTeachers({ limit: 1 }),
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getCurrentAcademicYear(),
      ]);
      
      setStats({
        students: studentsRes.data?.pagination?.total || studentsRes.data?.length || 0,
        teachers: teachersRes.data?.pagination?.total || teachersRes.data?.length || 0,
        classes: classesRes.data?.length || 0,
        subjects: subjectsRes.data?.length || 0,
      });
      setCurrentYear(yearRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.firstName}!</h1>
          <p className="text-muted">
            {currentYear ? `Academic Year: ${currentYear.name}` : 'School Management Dashboard'}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Students"
          value={loading ? '...' : stats.students}
          icon={GraduationCap}
          color="primary"
        />
        <StatCard
          title="Total Teachers"
          value={loading ? '...' : stats.teachers}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Classes"
          value={loading ? '...' : stats.classes}
          icon={BookOpen}
          color="warning"
        />
        <StatCard
          title="Subjects"
          value={loading ? '...' : stats.subjects}
          icon={ClipboardList}
          color="info"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <a href="/admin/students" className="action-btn">
              <GraduationCap size={20} />
              <span>Manage Students</span>
            </a>
            <a href="/admin/teachers" className="action-btn">
              <Users size={20} />
              <span>Manage Teachers</span>
            </a>
            <a href="/admin/academic" className="action-btn">
              <Calendar size={20} />
              <span>Academic Setup</span>
            </a>
            <a href="/admin/teacher-assignment" className="action-btn">
              <Award size={20} />
              <span>Teacher Assignment</span>
            </a>
          </div>
        </div>

        <div className="card">
          <h3>System Overview</h3>
          <div className="overview-list">
            <div className="overview-item">
              <span>Current Academic Year</span>
              <strong>{currentYear?.name || 'Not Set'}</strong>
            </div>
            <div className="overview-item">
              <span>School</span>
              <strong>{user?.school?.name || 'N/A'}</strong>
            </div>
            <div className="overview-item">
              <span>Your Role</span>
              <strong>{user?.roles?.[0]}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
