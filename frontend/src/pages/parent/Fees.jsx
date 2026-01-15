import React, { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
} from "lucide-react";
import { Select } from "../../components/common/FormElements";
import { feeService } from "../../api/feeService";
import { parentService } from "../../api/parentService";

const ParentFees = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [feeSummary, setFeeSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchFees(selectedChildId);
    }
  }, [selectedChildId]);

  const fetchChildren = async () => {
    try {
      const response = await parentService.getMyChildren();
      const childrenData = response.data || [];
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].id.toString());
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async (studentId) => {
    setLoading(true);
    try {
      const response = await feeService.getStudentFeeSummary(studentId);
      setFeeSummary(response.data || []);
    } catch (error) {
      console.error("Error fetching fees:", error);
      setFeeSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: { class: "badge-success", icon: CheckCircle, label: "Paid" },
      partial: { class: "badge-warning", icon: Clock, label: "Partial" },
      pending: { class: "badge-danger", icon: AlertCircle, label: "Pending" },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`badge ${badge.class}`}>
        <Icon size={12} style={{ marginRight: "4px" }} />
        {badge.label}
      </span>
    );
  };

  const selectedChild = children.find(
    (c) => c.id.toString() === selectedChildId
  );

  if (loading && children.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Fee Details</h1>
          <p className="text-muted">
            View fee details and payment status for your children
          </p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="card" style={{ marginBottom: "1rem", padding: "1rem" }}>
          <div className="flex items-center gap-4">
            <Users size={18} className="text-muted" />
            <div style={{ minWidth: "250px" }}>
              <Select
                label=""
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                options={children.map((child) => ({
                  value: child.id,
                  label: `${child.user?.firstName} ${child.user?.lastName}`,
                }))}
              />
            </div>
            {selectedChild && (
              <div className="text-muted">
                {selectedChild.currentClass?.class?.name} -{" "}
                {selectedChild.currentClass?.section?.name}
              </div>
            )}
          </div>
        </div>
      )}

      {children.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={48} className="text-muted" />
            <h3>No Children Found</h3>
            <p className="text-muted">
              No children are linked to your account.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="card">
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Loading fees...</p>
          </div>
        </div>
      ) : feeSummary.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <DollarSign size={48} className="text-muted" />
            <h3>No Fee Records</h3>
            <p className="text-muted">
              No fee records have been generated yet.
            </p>
          </div>
        </div>
      ) : (
        feeSummary.map((yearData, idx) => (
          <div key={idx} className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2">
                    {yearData.studentClass?.academicYear?.name}
                    {yearData.studentClass?.academicYear?.isCurrent && (
                      <span className="badge badge-primary">Current</span>
                    )}
                  </h2>
                  <p className="text-muted">
                    {yearData.studentClass?.class?.name} -{" "}
                    {yearData.studentClass?.section?.name}
                    {yearData.studentClass?.rollNumber &&
                      ` (Roll: ${yearData.studentClass.rollNumber})`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-muted">Balance</div>
                  <div
                    className={`text-xl font-bold ${
                      yearData.balance > 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {formatCurrency(yearData.balance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div
              className="grid grid-cols-3 gap-4"
              style={{
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                margin: "1rem",
              }}
            >
              <div className="text-center">
                <div className="text-muted text-sm">Total Due</div>
                <div className="font-bold">
                  {formatCurrency(yearData.totalDue)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted text-sm">Total Paid</div>
                <div className="font-bold text-success">
                  {formatCurrency(yearData.totalPaid)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted text-sm">Outstanding</div>
                <div
                  className={`font-bold ${
                    yearData.balance > 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {formatCurrency(yearData.balance)}
                </div>
              </div>
            </div>

            {/* Fee Details */}
            <table className="data-table" style={{ margin: "1rem" }}>
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {yearData.fees.map((fee) => (
                  <tr key={fee.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-primary" />
                        {fee.feeType?.name}
                      </div>
                    </td>
                    <td>{formatCurrency(fee.amountDue)}</td>
                    <td className="text-success">
                      {formatCurrency(fee.amountPaid)}
                    </td>
                    <td
                      className={
                        fee.balance > 0 ? "text-danger" : "text-success"
                      }
                    >
                      {formatCurrency(fee.balance)}
                    </td>
                    <td>{getStatusBadge(fee.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default ParentFees;
