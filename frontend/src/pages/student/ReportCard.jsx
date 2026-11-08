import React from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";
import ReportCardView from "../../components/portal/ReportCardView";

/** The printable report card for a published exam. */
const ReportCard = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={FileText} title="Report card" description="Print it or save it as a PDF." className="print:hidden" />
      <ReportCardView studentId={user?.student?.id} />
    </div>
  );
};

export default ReportCard;
