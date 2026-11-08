import React from "react";
import { FileText } from "lucide-react";
import ParentPage from "../../components/portal/ParentPage";
import ReportCardView from "../../components/portal/ReportCardView";

/** A linked child's printable report card. */
const ParentReportCard = () => (
  <ParentPage icon={FileText} title="Report card" description="Print it or save it as a PDF." maxWidth="max-w-5xl" render={(child) => <ReportCardView studentId={child.id} />} />
);

export default ParentReportCard;
