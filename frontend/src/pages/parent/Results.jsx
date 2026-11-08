import React from "react";
import { Award } from "lucide-react";
import ParentPage from "../../components/portal/ParentPage";
import ResultsView from "../../components/portal/ResultsView";

/** A linked child's results from published report cards. */
const ParentResults = () => (
  <ParentPage icon={Award} title="Results" description="Marks and grades from published report cards." render={(child) => <ResultsView studentId={child.id} />} />
);

export default ParentResults;
