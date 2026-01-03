import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/common/StatCard";
import {
  Users,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  Mail,
  Hash,
} from "lucide-react";
import { teacherService } from "../../api/teacherService";

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

const MyStudents = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ summary: null, classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const fetchMyStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teacherService.getMyStudents();
      const result = response.data || { summary: null, classes: [] };
      setData(result);

      // Auto-expand all classes and sections by default
      const classesExpanded = {};
      const sectionsExpanded = {};
      (result.classes || []).forEach((cls) => {
        classesExpanded[cls.classId] = true;
        cls.sections.forEach((sec) => {
          sectionsExpanded[`${cls.classId}-${sec.sectionId}`] = true;
        });
      });
      setExpandedClasses(classesExpanded);
      setExpandedSections(sectionsExpanded);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (classId) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const toggleSection = (classId, sectionId) => {
    const key = `${classId}-${sectionId}`;
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter students based on search term
  const filterStudents = (students) => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.admissionNumber?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.rollNumber?.toString().includes(term)
    );
  };

  // Count filtered students for summary
  const getFilteredCount = () => {
    if (!searchTerm.trim()) return data.summary?.totalStudents || 0;
    let count = 0;
    data.classes.forEach((cls) => {
      cls.sections.forEach((sec) => {
        count += filterStudents(sec.students).length;
      });
    });
    return count;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card error-card">
          <h3>Error Loading Students</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchMyStudents}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { summary, classes } = data;

  return (
    <div className="page-container my-students-page">
      <div className="page-header">
        <div>
          <h1>My Students</h1>
          <p className="text-muted">
            View students enrolled in your assigned classes
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="stats-grid">
          <StatCard
            title="Classes"
            value={summary.totalClasses}
            icon={BookOpen}
            color="primary"
          />
          <StatCard
            title="Sections"
            value={summary.totalSections}
            icon={Layers}
            color="info"
          />
          <StatCard
            title="Total Students"
            value={summary.totalStudents}
            icon={Users}
            color="success"
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="card search-card">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, admission number, email, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <span className="search-results-count">
              {getFilteredCount()} student(s) found
            </span>
          )}
        </div>
      </div>

      {/* Class/Section/Student Tree */}
      {classes.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} className="empty-icon" />
          <h3>No Students Found</h3>
          <p>
            You don't have any class assignments for the current academic year.
          </p>
        </div>
      ) : (
        <div className="students-tree">
          {classes.map((cls) => {
            const isClassExpanded = expandedClasses[cls.classId];

            return (
              <div key={cls.classId} className="class-card card">
                {/* Class Header */}
                <div
                  className="class-header"
                  onClick={() => toggleClass(cls.classId)}
                >
                  <div className="class-header-left">
                    {isClassExpanded ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                    <BookOpen size={20} className="class-icon" />
                    <h3>{cls.className}</h3>
                  </div>
                  <div className="class-header-right">
                    <span className="badge badge-primary">
                      {cls.sections.length} section(s)
                    </span>
                    <span className="badge badge-success">
                      {cls.sections.reduce(
                        (acc, s) => acc + s.students.length,
                        0
                      )}{" "}
                      students
                    </span>
                  </div>
                </div>

                {/* Sections */}
                {isClassExpanded && (
                  <div className="sections-container">
                    {cls.sections.map((section) => {
                      const sectionKey = `${cls.classId}-${section.sectionId}`;
                      const isSectionExpanded = expandedSections[sectionKey];
                      const filteredStudents = filterStudents(section.students);

                      return (
                        <div key={section.sectionId} className="section-card">
                          {/* Section Header */}
                          <div
                            className="section-header"
                            onClick={() =>
                              toggleSection(cls.classId, section.sectionId)
                            }
                          >
                            <div className="section-header-left">
                              {isSectionExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                              <Layers size={16} className="section-icon" />
                              <h4>Section {section.sectionName}</h4>
                            </div>
                            <span className="badge badge-info">
                              {filteredStudents.length} student(s)
                            </span>
                          </div>

                          {/* Students Table */}
                          {isSectionExpanded && (
                            <div className="students-table-container">
                              {filteredStudents.length === 0 ? (
                                <div className="empty-section">
                                  <p>No students match your search criteria.</p>
                                </div>
                              ) : (
                                <table className="students-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "60px" }}>Roll</th>
                                      <th>Student</th>
                                      <th>Admission No.</th>
                                      <th>Email</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredStudents.map((student) => (
                                      <tr key={student.studentId}>
                                        <td className="roll-cell">
                                          <Hash size={12} />
                                          {student.rollNumber || "-"}
                                        </td>
                                        <td className="student-cell">
                                          <div className="student-info">
                                            {student.avatarUrl ? (
                                              <img
                                                src={resolveAssetUrl(
                                                  student.avatarUrl
                                                )}
                                                alt={student.fullName}
                                                className="student-avatar"
                                              />
                                            ) : (
                                              <div className="student-avatar-placeholder">
                                                {student.firstName?.[0] || "S"}
                                              </div>
                                            )}
                                            <span className="student-name">
                                              {student.fullName}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="admission-cell">
                                          {student.admissionNumber || "-"}
                                        </td>
                                        <td className="email-cell">
                                          {student.email ? (
                                            <a href={`mailto:${student.email}`}>
                                              <Mail size={12} />
                                              {student.email}
                                            </a>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Page Styles */}
      <style>{`
        .my-students-page .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-card {
          margin-bottom: 1.5rem;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.95rem;
        }

        .search-results-count {
          font-size: 0.85rem;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-state .empty-icon {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        .students-tree {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .class-card {
          overflow: hidden;
        }

        .class-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: var(--bg-light);
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .class-header:hover {
          background: var(--bg-hover);
        }

        .class-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .class-header-left h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .class-icon {
          color: var(--primary);
        }

        .class-header-right {
          display: flex;
          gap: 0.5rem;
        }

        .sections-container {
          padding: 0.5rem 1rem 1rem;
        }

        .section-card {
          margin-top: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: var(--bg-subtle);
          cursor: pointer;
          user-select: none;
        }

        .section-header:hover {
          background: var(--bg-hover);
        }

        .section-header-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-header-left h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .section-icon {
          color: var(--info);
        }

        .students-table-container {
          padding: 0.5rem;
        }

        .empty-section {
          padding: 1rem;
          text-align: center;
          color: var(--text-muted);
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
        }

        .students-table th,
        .students-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .students-table th {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .students-table tbody tr:hover {
          background: var(--bg-hover);
        }

        .students-table tbody tr:last-child td {
          border-bottom: none;
        }

        .roll-cell {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted);
        }

        .student-cell .student-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .student-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .student-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .student-name {
          font-weight: 500;
        }

        .email-cell a {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          text-decoration: none;
        }

        .email-cell a:hover {
          text-decoration: underline;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .badge-primary {
          background: var(--primary-light);
          color: var(--primary);
        }

        .badge-success {
          background: var(--success-light);
          color: var(--success);
        }

        .badge-info {
          background: var(--info-light);
          color: var(--info);
        }

        .error-card {
          text-align: center;
          padding: 2rem;
        }

        .error-card h3 {
          color: var(--danger);
          margin-bottom: 0.5rem;
        }

        .error-card p {
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .class-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .class-header-right {
            margin-left: 2.5rem;
          }

          .students-table {
            font-size: 0.9rem;
          }

          .email-cell {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default MyStudents;
