import React from "react";
import ParentPage from "../../components/portal/ParentPage";
import ReportCardView from "../../components/portal/ReportCardView";

/** A linked child's printable report card. */
const ParentReportCard = () => (
  <ParentPage title="Report card" description="Print it or save it as a PDF." render={(child) => <ReportCardView studentId={child.id} />} />
);

export default ParentReportCard;
