import React from "react";
import { assignmentService } from "../../api/assignmentService";
import { PageHeader, PageShell } from "../../components/ui";
import AssignmentsView from "../../components/portal/AssignmentsView";

const loadOwn = () => assignmentService.getAssignments().then((res) => res.data);

/** The student's assignments; they hand work in from here. */
const Assignments = () => (
  <PageShell>
    <PageHeader title="My assignments" description="Work set by your teachers. Open one to see the details and hand it in." />
    <AssignmentsView load={loadOwn} canSubmit reloadKey="own" />
  </PageShell>
);

export default Assignments;
