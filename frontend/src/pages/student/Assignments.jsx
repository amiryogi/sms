import React from "react";
import { NotebookPen } from "lucide-react";
import { assignmentService } from "../../api/assignmentService";
import { PageHeader } from "../../components/ui";
import AssignmentsView from "../../components/portal/AssignmentsView";

const loadOwn = () => assignmentService.getAssignments().then((res) => res.data);

/** The student's assignments; they hand work in from here. */
const Assignments = () => (
  <div className="mx-auto max-w-4xl space-y-6">
    <PageHeader icon={NotebookPen} title="My assignments" description="Work set by your teachers. Open one to see the details and hand it in." />
    <AssignmentsView load={loadOwn} canSubmit reloadKey="own" />
  </div>
);

export default Assignments;
