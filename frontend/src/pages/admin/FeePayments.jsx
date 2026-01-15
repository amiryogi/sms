import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  DollarSign,
  Filter,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button } from "../../components/common/FormElements";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";

const FeePayments = () => {
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterClassId, setFilterClassId] = useState("");
  const [filterYearId, setFilterYearId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const {
    register: registerGen,
    handleSubmit: handleSubmitGen,
    reset: resetGen,
    formState: { errors: errorsGen },
  } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClassId, filterYearId, filterStatus]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);

      const currentYear = (yearsRes.data || []).find((y) => y.isCurrent);
      if (currentYear) {
        setFilterYearId(currentYear.id.toString());
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClassId) params.classId = filterClassId;
      if (filterYearId) params.academicYearId = filterYearId;
      if (filterStatus) params.status = filterStatus;

      const response = await feeService.getFeePayments(params);
      setPayments(response.data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    const balance =
      parseFloat(payment.amountDue) - parseFloat(payment.amountPaid);
    reset({
      amountPaid: balance,
      paymentMethod: "cash",
      remarks: "",
    });
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setSelectedPayment(null);
    reset();
  };

  const onPaySubmit = async (data) => {
    setSubmitting(true);
    try {
      await feeService.recordPayment(selectedPayment.id, {
        amountPaid: parseFloat(data.amountPaid),
        paymentMethod: data.paymentMethod,
        remarks: data.remarks,
        paymentDate: new Date().toISOString(),
      });
      fetchPayments();
      closePayModal();
    } catch (error) {
      console.error("Error recording payment:", error);
      alert(error.response?.data?.message || "Error recording payment");
    } finally {
      setSubmitting(false);
    }
  };

  const openGenerateModal = () => {
    resetGen({
      classId: filterClassId || "",
      academicYearId: filterYearId || "",
    });
    setGenerateModalOpen(true);
  };

  const closeGenerateModal = () => {
    setGenerateModalOpen(false);
    resetGen();
  };

  const onGenerateSubmit = async (data) => {
    setSubmitting(true);
    try {
      await feeService.bulkGenerateFees({
        classId: parseInt(data.classId),
        academicYearId: parseInt(data.academicYearId),
      });
      fetchPayments();
      closeGenerateModal();
      alert("Fees generated successfully for all students");
    } catch (error) {
      console.error("Error generating fees:", error);
      alert(error.response?.data?.message || "Error generating fees");
    } finally {
      setSubmitting(false);
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

  // Summary stats
  const stats = payments.reduce(
    (acc, p) => {
      acc.totalDue += parseFloat(p.amountDue);
      acc.totalPaid += parseFloat(p.amountPaid);
      if (p.status === "paid") acc.paidCount++;
      else if (p.status === "partial") acc.partialCount++;
      else acc.pendingCount++;
      return acc;
    },
    {
      totalDue: 0,
      totalPaid: 0,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
    }
  );

  const columns = [
    {
      header: "Student",
      render: (row) => {
        const student = row.studentClass?.student;
        return (
          <div>
            <div className="font-medium">
              {student?.user?.firstName} {student?.user?.lastName}
            </div>
            <div className="text-muted text-sm">
              {row.studentClass?.class?.name} -{" "}
              {row.studentClass?.section?.name}
            </div>
          </div>
        );
      },
    },
    {
      header: "Fee Type",
      render: (row) => (
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-primary" />
          <span>{row.feeStructure?.feeType?.name}</span>
        </div>
      ),
    },
    {
      header: "Amount Due",
      render: (row) => formatCurrency(row.amountDue),
    },
    {
      header: "Amount Paid",
      render: (row) => (
        <span className={parseFloat(row.amountPaid) > 0 ? "text-success" : ""}>
          {formatCurrency(row.amountPaid)}
        </span>
      ),
    },
    {
      header: "Balance",
      render: (row) => {
        const balance = parseFloat(row.amountDue) - parseFloat(row.amountPaid);
        return (
          <span
            className={balance > 0 ? "text-danger font-medium" : "text-success"}
          >
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      header: "Status",
      width: "100px",
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: "Actions",
      width: "100px",
      render: (row) => {
        const balance = parseFloat(row.amountDue) - parseFloat(row.amountPaid);
        if (balance <= 0) return <span className="text-muted">-</span>;
        return (
          <Button size="sm" onClick={() => openPayModal(row)}>
            <CreditCard size={14} style={{ marginRight: "4px" }} />
            Pay
          </Button>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Fee Payments</h1>
          <p className="text-muted">
            Manage student fee payments and generate fee records
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        style={{ marginBottom: "1rem" }}
      >
        <div className="card stat-card">
          <div className="stat-label">Total Due</div>
          <div className="stat-value">{formatCurrency(stats.totalDue)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value text-success">
            {formatCurrency(stats.totalPaid)}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value text-danger">
            {formatCurrency(stats.totalDue - stats.totalPaid)}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Payment Status</div>
          <div className="flex gap-2" style={{ marginTop: "8px" }}>
            <span className="badge badge-success">{stats.paidCount} Paid</span>
            <span className="badge badge-warning">
              {stats.partialCount} Partial
            </span>
            <span className="badge badge-danger">
              {stats.pendingCount} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "1rem", padding: "1rem" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <Filter size={18} className="text-muted" />
          <div style={{ minWidth: "200px" }}>
            <Select
              label=""
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              options={[
                { value: "", label: "All Academic Years" },
                ...academicYears.map((y) => ({
                  value: y.id,
                  label: y.name + (y.isCurrent ? " (Current)" : ""),
                })),
              ]}
            />
          </div>
          <div style={{ minWidth: "200px" }}>
            <Select
              label=""
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              options={[
                { value: "", label: "All Classes" },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div style={{ minWidth: "150px" }}>
            <Select
              label=""
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "", label: "All Status" },
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "paid", label: "Paid" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          emptyMessage="No fee records found. Generate fees for a class to get started."
          actions={
            <Button icon={RefreshCw} onClick={openGenerateModal}>
              Generate Fees
            </Button>
          }
        />
      </div>

      {/* Pay Modal */}
      <Modal
        isOpen={payModalOpen}
        onClose={closePayModal}
        title="Record Payment"
        size="md"
      >
        {selectedPayment && (
          <form onSubmit={handleSubmit(onPaySubmit)}>
            <div
              className="card"
              style={{
                background: "#f8f9fa",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div className="text-muted">Student</div>
              <div className="font-medium">
                {selectedPayment.studentClass?.student?.user?.firstName}{" "}
                {selectedPayment.studentClass?.student?.user?.lastName}
              </div>
              <div className="text-muted" style={{ marginTop: "8px" }}>
                Fee Type
              </div>
              <div className="font-medium">
                {selectedPayment.feeStructure?.feeType?.name}
              </div>
              <div className="flex gap-4" style={{ marginTop: "8px" }}>
                <div>
                  <div className="text-muted">Due</div>
                  <div className="font-medium">
                    {formatCurrency(selectedPayment.amountDue)}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Paid</div>
                  <div className="font-medium text-success">
                    {formatCurrency(selectedPayment.amountPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Balance</div>
                  <div className="font-medium text-danger">
                    {formatCurrency(
                      parseFloat(selectedPayment.amountDue) -
                        parseFloat(selectedPayment.amountPaid)
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Input
              label="Amount to Pay (₹)"
              name="amountPaid"
              type="number"
              step="0.01"
              min="0.01"
              max={
                parseFloat(selectedPayment.amountDue) -
                parseFloat(selectedPayment.amountPaid)
              }
              register={register}
              rules={{
                required: "Amount is required",
                min: { value: 0.01, message: "Amount must be greater than 0" },
              }}
              error={errors.amountPaid?.message}
            />
            <Select
              label="Payment Method"
              name="paymentMethod"
              register={register}
              options={[
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "upi", label: "UPI" },
                { value: "card", label: "Card" },
              ]}
            />
            <Input
              label="Remarks (Optional)"
              name="remarks"
              placeholder="Any notes about this payment"
              register={register}
            />
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closePayModal}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Generate Fees Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={closeGenerateModal}
        title="Generate Fee Records"
        size="md"
      >
        <form onSubmit={handleSubmitGen(onGenerateSubmit)}>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            This will create fee payment records for all active students in the
            selected class based on the defined fee structures.
          </p>
          <Select
            label="Academic Year"
            name="academicYearId"
            register={registerGen}
            rules={{ required: "Academic year is required" }}
            error={errorsGen.academicYearId?.message}
            options={[
              { value: "", label: "Select Academic Year" },
              ...academicYears.map((y) => ({
                value: y.id,
                label: y.name + (y.isCurrent ? " (Current)" : ""),
              })),
            ]}
          />
          <Select
            label="Class"
            name="classId"
            register={registerGen}
            rules={{ required: "Class is required" }}
            error={errorsGen.classId?.message}
            options={[
              { value: "", label: "Select Class" },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeGenerateModal}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Generate Fees
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeePayments;
