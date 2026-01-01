import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';
import { Users, ClipboardList, Award, BookOpen } from 'lucide-react';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState(null);
  const children = user?.parent?.children || [];

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [children]);

  const handleChildChange = (e) => {
    const childId = parseInt(e.target.value);
    const child = children.find(c => c.id === childId);
    setSelectedChild(child);
  };

  return (
    <div className="parent-dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.firstName}!</h1>
          <p className="text-muted">Parent Dashboard</p>
        </div>
      </div>

      {children.length > 1 && (
        <div className="card child-selector">
          <label>Select Child:</label>
          <select 
            value={selectedChild?.id || ''} 
            onChange={handleChildChange}
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.user?.firstName} {child.user?.lastName} - {child.enrollments?.[0]?.class?.name || 'Not Enrolled'}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedChild && (
        <>
          <div className="stats-grid">
            <StatCard
              title="Child Name"
              value={`${selectedChild.user?.firstName} ${selectedChild.user?.lastName}`}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Class"
              value={selectedChild.enrollments?.[0]?.class?.name || 'N/A'}
              icon={BookOpen}
              color="success"
            />
            <StatCard
              title="Section"
              value={selectedChild.enrollments?.[0]?.section?.name || 'N/A'}
              icon={ClipboardList}
              color="warning"
            />
            <StatCard
              title="Roll Number"
              value={selectedChild.rollNumber || selectedChild.enrollments?.[0]?.rollNumber || 'N/A'}
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
              </div>
            </div>

            <div className="card">
              <h3>Student Information</h3>
              <div className="overview-list">
                <div className="overview-item">
                  <span>Admission Number</span>
                  <strong>{selectedChild.admissionNumber || 'N/A'}</strong>
                </div>
                <div className="overview-item">
                  <span>Date of Birth</span>
                  <strong>
                    {selectedChild.dateOfBirth 
                      ? new Date(selectedChild.dateOfBirth).toLocaleDateString() 
                      : 'N/A'}
                  </strong>
                </div>
                <div className="overview-item">
                  <span>Gender</span>
                  <strong>{selectedChild.gender || 'N/A'}</strong>
                </div>
              </div>
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
