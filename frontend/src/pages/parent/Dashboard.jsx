import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import NoticesFeed from "../../components/common/NoticesFeed";
import {
  Users,
  ClipboardList,
  Award,
  BookOpen,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { parentService } from "../../api/parentService";

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch children from the dedicated API endpoint
  const loadChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await parentService.getMyChildren();
      const childList = response.data?.children || response.children || [];
      setChildren(childList);

      // Auto-select first child if none selected
      if (childList.length > 0 && !selectedChild) {
        setSelectedChild(childList[0]);
      } else if (selectedChild) {
        // Keep selection synced after refresh
        const updated = childList.find((c) => c.id === selectedChild.id);
        if (updated) setSelectedChild(updated);
      }
    } catch (err) {
      console.error("Error loading children:", err);
      setError(err.response?.data?.message || "Failed to load children data");
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  const handleChildChange = (e) => {
    const childId = parseInt(e.target.value);
    const child = children.find((c) => c.id === childId);
    setSelectedChild(child);
  };

  // Helper to safely get enrollment data
  const getEnrollment = (child) => {
    return child?.currentEnrollment || child?.enrollments?.[0] || null;
  };

  if (loading) {
    return (
      <div className="parent-dashboard">
        <div className="page-header">
          <h1>Welcome, {user?.firstName}!</h1>
        </div>
        <div className="card">
          <div className="text-center">
            <RefreshCw className="spinning" size={32} />
            <p>Loading children data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-dashboard">
        <div className="page-header">
          <h1>Welcome, {user?.firstName}!</h1>
        </div>
        <div className="card">
          <div className="text-center text-danger">
            <AlertCircle size={48} />
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadChildren}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.firstName}!</h1>
          <p className="text-muted">Parent Dashboard</p>
        </div>
        <button className="btn btn-outline" onClick={loadChildren}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {children.length > 1 && (
        <div className="card child-selector">
          <label>Select Child:</label>
          <select value={selectedChild?.id || ""} onChange={handleChildChange}>
            {children.map((child) => {
              const enrollment = getEnrollment(child);
              return (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName} -{" "}
                  {enrollment?.class?.name || "Not Enrolled"}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {selectedChild && (
        <>
          <div className="stats-grid">
            <StatCard
              title="Child Name"
              value={`${selectedChild.firstName} ${selectedChild.lastName}`}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Class"
              value={getEnrollment(selectedChild)?.class?.name || "N/A"}
              icon={BookOpen}
              color="success"
            />
            <StatCard
              title="Section"
              value={getEnrollment(selectedChild)?.section?.name || "N/A"}
              icon={ClipboardList}
              color="warning"
            />
            <StatCard
              title="Roll Number"
              value={
                selectedChild.rollNumber ||
                getEnrollment(selectedChild)?.rollNumber ||
                "N/A"
              }
              icon={Award}
              color="info"
            />
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <Link to="/parent/attendance" className="action-btn">
                  <ClipboardList size={20} />
                  <span>View Attendance</span>
                </Link>
                <Link to="/parent/results" className="action-btn">
                  <Award size={20} />
                  <span>View Results</span>
                </Link>
                <Link to="/parent/report-card" className="action-btn">
                  <BookOpen size={20} />
                  <span>View Report Card</span>
                </Link>
              </div>
            </div>

            <div className="card">
              <h3>Student Information</h3>
              <div className="overview-list">
                <div className="overview-item">
                  <span>Admission Number</span>
                  <strong>{selectedChild.admissionNumber || "N/A"}</strong>
                </div>
                <div className="overview-item">
                  <span>Date of Birth</span>
                  <strong>
                    {selectedChild.dateOfBirth
                      ? new Date(selectedChild.dateOfBirth).toLocaleDateString()
                      : "N/A"}
                  </strong>
                </div>
                <div className="overview-item">
                  <span>Gender</span>
                  <strong>{selectedChild.gender || "N/A"}</strong>
                </div>
                <div className="overview-item">
                  <span>Status</span>
                  <strong
                    className={
                      selectedChild.status === "active"
                        ? "text-success"
                        : "text-muted"
                    }
                  >
                    {selectedChild.status || "N/A"}
                  </strong>
                </div>
                <div className="overview-item">
                  <span>Relationship</span>
                  <strong>{selectedChild.relationship || "N/A"}</strong>
                </div>
                <div className="overview-item">
                  <span>Academic Year</span>
                  <strong>
                    {getEnrollment(selectedChild)?.academicYear?.name || "N/A"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Notices Feed */}
            <div className="card">
              <NoticesFeed
                limit={4}
                showViewAll={true}
                viewAllPath="/parent/notices"
                compact={true}
              />
            </div>
          </div>
        </>
      )}

      {children.length === 0 && (
        <div className="card">
          <div className="text-center text-muted">
            <Users size={48} />
            <p>No children linked to your account.</p>
            <p>Please contact the school administrator.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
