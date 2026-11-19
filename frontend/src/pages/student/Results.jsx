import React from "react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, PageShell } from "../../components/ui";
import ResultsView from "../../components/portal/ResultsView";

/** Results of the student's published report cards, subject by subject. */
const Results = () => {
  const { user } = useAuth();
  return (
    <PageShell>
      <PageHeader title="My results" description="Marks and grades from your published report cards." />
      <ResultsView studentId={user?.student?.id} />
    </PageShell>
  );
};

export default Results;
