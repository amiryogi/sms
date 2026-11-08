import React from "react";
import { Award } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";
import ResultsView from "../../components/portal/ResultsView";

/** Results of the student's published report cards, subject by subject. */
const Results = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={Award} title="My results" description="Marks and grades from your published report cards." />
      <ResultsView studentId={user?.student?.id} />
    </div>
  );
};

export default Results;
