import React from "react";
import { useParams } from "react-router-dom";
import { FileText, ReceiptText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ParentPage from "../../components/portal/ParentPage";
import { StatementPrint, StudentBillPrint } from "../../components/finance/print/FeePrintViews";

/**
 * Route wrappers for the printable statement and bill: the same views for
 * fee staff (/finance/accounts/:studentId/...), a student (their own) and a
 * parent (the chosen child). The API refuses anyone else's.
 */

export const StaffStatement = () => <StatementPrint studentId={useParams().studentId} />;
export const StaffBill = () => <StudentBillPrint studentId={useParams().studentId} />;

export const StudentStatement = () => <StatementPrint studentId={useAuth().user?.student?.id} />;
export const StudentBill = () => <StudentBillPrint studentId={useAuth().user?.student?.id} />;

export const ParentStatement = () => (
  <ParentPage icon={FileText} title="Fee statement" maxWidth="max-w-4xl" render={(child) => <StatementPrint studentId={child.id} />} />
);
export const ParentBill = () => (
  <ParentPage icon={ReceiptText} title="Fee bill" maxWidth="max-w-4xl" render={(child) => <StudentBillPrint studentId={child.id} />} />
);
