import React from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";
import FeesView from "../../components/portal/FeesView";

/** The student's fees, due dates, receipts and discounts (read-only). */
const Fees = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={Wallet} title="My fees" description="What is due, what has been paid, and your receipts." />
      <FeesView studentId={user?.student?.id} receiptPath={(id) => `/student/receipts/${id}`} />
    </div>
  );
};

export default Fees;
