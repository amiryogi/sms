import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/common/StatCard";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  Award,
  TrendingUp,
} from "lucide-react";
import { studentService } from "../../api/studentService";
import { teacherService } from "../../api/teacherService";
import { academicService } from "../../api/academicService";

const extractList = (res, key) =>
  res?.data?.[key] || res?.data || res?.[key] || res || [];

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url
    .replace(/^\\?/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/")}`;
};

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
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, subjectsRes, yearRes] =
        await Promise.all([
          studentService.getStudents({ limit: 6, sort: "createdAt:desc" }),
          teacherService.getTeachers({ limit: 6, sort: "createdAt:desc" }),
          academicService.getClasses(),
          academicService.getSubjects(),
          academicService.getCurrentAcademicYear(),
        ]);

      const studentList = extractList(studentsRes, "students");
      const teacherList = extractList(teachersRes, "teachers");

      setStats({
        students:
          studentsRes.data?.pagination?.total || studentList.length || 0,
        teachers:
          teachersRes.data?.pagination?.total || teacherList.length || 0,
        classes: classesRes.data?.length || 0,
        subjects: subjectsRes.data?.length || 0,
      });
      setRecentStudents(studentList.slice(0, 6));
      setRecentTeachers(teacherList.slice(0, 6));
      setCurrentYear(yearRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
            {currentYear
              ? `Academic Year: ${currentYear.name}`
              : "School Management Dashboard"}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Students"
          value={loading ? "..." : stats.students}
          icon={GraduationCap}
          color="primary"
        />
        <StatCard
          title="Total Teachers"
          value={loading ? "..." : stats.teachers}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Classes"
          value={loading ? "..." : stats.classes}
          icon={BookOpen}
          color="warning"
        />
        <StatCard
          title="Subjects"
          value={loading ? "..." : stats.subjects}
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
              <strong>{currentYear?.name || "Not Set"}</strong>
            </div>
            <div className="overview-item">
              <span>School</span>
              <strong>{user?.school?.name || "N/A"}</strong>
            </div>
            <div className="overview-item">
              <span>Your Role</span>
              <strong>{user?.roles?.[0]}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>People Spotlight</h3>
          <div className="people-grid">
            {recentStudents.map((s) => (
              <div key={`student-${s.id}`} className="avatar-pill">
                {s.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(s.avatarUrl)}
                    alt="Student"
                    className="user-avatar-sm"
                  />
                ) : (
                  <div className="user-avatar-placeholder-sm">
                    {(s.firstName || "S")[0]}
                  </div>
                )}
                <div className="avatar-meta">
                  <div className="avatar-name">
                    {s.firstName} {s.lastName}
                  </div>
                  <div className="avatar-role">Student</div>
                </div>
              </div>
            ))}
            {recentTeachers.map((t) => (
              <div key={`teacher-${t.id}`} className="avatar-pill">
                {t.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(t.avatarUrl)}
                    alt="Teacher"
                    className="user-avatar-sm"
                  />
                ) : (
                  <div className="user-avatar-placeholder-sm">
                    {(t.firstName || "T")[0]}
                  </div>
                )}
                <div className="avatar-meta">
                  <div className="avatar-name">
                    {t.firstName} {t.lastName}
                  </div>
                  <div className="avatar-role">Teacher</div>
                </div>
              </div>
            ))}
            {!recentStudents.length && !recentTeachers.length && (
              <p className="text-muted">No people to show yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
