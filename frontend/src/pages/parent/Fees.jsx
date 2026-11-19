import React from "react";
import ParentPage from "../../components/portal/ParentPage";
import FeesView from "../../components/portal/FeesView";

/** A linked child's fees, due dates, receipts and discounts (read-only). */
const ParentFees = () => (
  <ParentPage
    title="Fees"
    description="What is due, what has been paid, and the receipts."
    render={(child) => (
      <FeesView
        studentId={child.id}
        receiptPath={(id) => `/parent/receipts/${id}?child=${child.id}`}
        printPaths={{ statement: `/parent/fees/statement?child=${child.id}`, bill: `/parent/fees/bill?child=${child.id}` }}
      />
    )}
  />
);

export default ParentFees;
