import React from "react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, PageShell } from "../../components/ui";
import ReportCardView from "../../components/portal/ReportCardView";

/** The printable report card for a published exam. */
const ReportCard = () => {
  const { user } = useAuth();
  return (
    <PageShell>
      <PageHeader title="Report card" description="Print it or save it as a PDF." className="print:hidden" />
      <ReportCardView studentId={user?.student?.id} />
    </PageShell>
  );
};

export default ReportCard;
