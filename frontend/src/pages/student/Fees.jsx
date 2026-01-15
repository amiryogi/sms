import React, { useState, useEffect } from "react";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { feeService } from "../../api/feeService";

const StudentFees = () => {
  const [feeSummary, setFeeSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      // The backend will automatically filter to current student
      const response = await feeService.getFeePayments();
      // Group by academic year
      const grouped = groupByYear(response.data || []);
      setFeeSummary(grouped);
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByYear = (payments) => {
    const groups = {};
    payments.forEach((p) => {
      const yearName = p.studentClass?.academicYear?.name || "Unknown";
      if (!groups[yearName]) {
        groups[yearName] = {
          year: yearName,
          isCurrent: p.studentClass?.academicYear?.isCurrent,
          class: p.studentClass?.class?.name,
          section: p.studentClass?.section?.name,
          fees: [],
          totalDue: 0,
          totalPaid: 0,
        };
      }
      groups[yearName].fees.push(p);
      groups[yearName].totalDue += parseFloat(p.amountDue);
      groups[yearName].totalPaid += parseFloat(p.amountPaid);
    });
    return Object.values(groups).sort(
      (a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0)
    );
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Fees</h1>
          <p className="text-muted">View your fee details and payment status</p>
        </div>
      </div>

      {feeSummary.length === 0 ? (
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
                    {yearData.year}
                    {yearData.isCurrent && (
                      <span className="badge badge-primary">Current</span>
                    )}
                  </h2>
                  <p className="text-muted">
                    {yearData.class} - {yearData.section}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-muted">Balance</div>
                  <div
                    className={`text-xl font-bold ${
                      yearData.totalDue - yearData.totalPaid > 0
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {formatCurrency(yearData.totalDue - yearData.totalPaid)}
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
                    yearData.totalDue - yearData.totalPaid > 0
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {formatCurrency(yearData.totalDue - yearData.totalPaid)}
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
                {yearData.fees.map((fee) => {
                  const balance =
                    parseFloat(fee.amountDue) - parseFloat(fee.amountPaid);
                  return (
                    <tr key={fee.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-primary" />
                          {fee.feeStructure?.feeType?.name}
                        </div>
                      </td>
                      <td>{formatCurrency(fee.amountDue)}</td>
                      <td className="text-success">
                        {formatCurrency(fee.amountPaid)}
                      </td>
                      <td
                        className={balance > 0 ? "text-danger" : "text-success"}
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td>{getStatusBadge(fee.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentFees;
