import React from "react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, PageShell } from "../../components/ui";
import FeesView from "../../components/portal/FeesView";

/** The student's fees, due dates, receipts and discounts (read-only). */
const Fees = () => {
  const { user } = useAuth();
  return (
    <PageShell>
      <PageHeader title="My fees" description="What is due, what has been paid, and your receipts." />
      <FeesView studentId={user?.student?.id} receiptPath={(id) => `/student/receipts/${id}`} printPaths={{ statement: "/student/fees/statement", bill: "/student/fees/bill" }} />
    </PageShell>
  );
};

export default Fees;
