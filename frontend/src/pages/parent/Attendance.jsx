import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select } from "../../components/common/FormElements";
import { Check, X, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { attendanceService } from "../../api/attendanceService";
import { parentService } from "../../api/parentService";

const Attendance = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [error, setError] = useState(null);

  // Fetch children from dedicated endpoint
  const loadChildren = async () => {
    setLoadingChildren(true);
    setError(null);
    try {
      const response = await parentService.getMyChildren();
      const childList = response.data?.children || response.children || [];
      setChildren(childList);
      if (childList.length > 0 && !selectedChild) {
        setSelectedChild(childList[0]);
      }
    } catch (err) {
      console.error("Error loading children:", err);
      setError(err.response?.data?.message || "Failed to load children");
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchAttendance();
    }
  }, [selectedChild]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceService.getStudentAttendanceSummary(
        selectedChild.id
      );
      setAttendanceSummary(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendanceSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (e) => {
    const childId = parseInt(e.target.value);
    const child = children.find((c) => c.id === childId);
    setSelectedChild(child);
  };

  // Map children to options using flat structure
  const childOptions = children.map((c) => ({
    value: c.id.toString(),
    label: `${c.firstName} ${c.lastName}`,
  }));

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <Check className="status-present" size={16} />;
      case "absent":
        return <X className="status-absent" size={16} />;
      case "late":
        return <Clock className="status-late" size={16} />;
      case "excused":
        return <AlertCircle className="status-excused" size={16} />;
      default:
        return null;
    }
  };

  if (loadingChildren) {
    return (
      <div className="page-container">
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
      <div className="page-container">
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
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p className="text-muted">View your child's attendance record</p>
        </div>
      </div>

      {children.length > 1 && (
        <div className="card filter-card">
          <Select
            label="Select Child"
            name="childId"
            options={childOptions}
            value={selectedChild?.id?.toString() || ""}
            onChange={handleChildChange}
          />
        </div>
      )}

      {selectedChild && (
        <div className="card">
          {loading ? (
            <div className="text-center">Loading attendance...</div>
          ) : !attendanceSummary ? (
            <div className="text-muted text-center">
              No attendance records found.
            </div>
          ) : (
            <>
              <div className="attendance-summary">
                <div className="summary-stat">
                  <span className="stat-value text-success">
                    {attendanceSummary.present || 0}
                  </span>
                  <span className="stat-label">Present</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value text-danger">
                    {attendanceSummary.absent || 0}
                  </span>
                  <span className="stat-label">Absent</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value text-warning">
                    {attendanceSummary.late || 0}
                  </span>
                  <span className="stat-label">Late</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value text-info">
                    {attendanceSummary.excused || 0}
                  </span>
                  <span className="stat-label">Excused</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">
                    {attendanceSummary.percentage || 0}%
                  </span>
                  <span className="stat-label">Attendance %</span>
                </div>
              </div>

              {attendanceSummary.records?.length > 0 && (
                <div className="attendance-records">
                  <h4>Recent Records</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSummary.records
                        .slice(0, 20)
                        .map((record, i) => (
                          <tr key={i}>
                            <td>
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                className={`status-badge status-${record.status}`}
                              >
                                {getStatusIcon(record.status)}
                                {record.status.charAt(0).toUpperCase() +
                                  record.status.slice(1)}
                              </span>
                            </td>
                            <td>{record.remarks || "-"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
