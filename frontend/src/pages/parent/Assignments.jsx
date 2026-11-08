import React from "react";
import { NotebookPen } from "lucide-react";
import { assignmentService } from "../../api/assignmentService";
import ParentPage from "../../components/portal/ParentPage";
import AssignmentsView from "../../components/portal/AssignmentsView";

/** A linked child's assignments and hand-ins, read-only (?studentId scopes the API to that child). */
const ParentAssignments = () => (
  <ParentPage
    icon={NotebookPen}
    title="Assignments"
    description="Work set for your child, what was handed in, marks and feedback."
    maxWidth="max-w-4xl"
    render={(child) => (
      <AssignmentsView load={() => assignmentService.getAssignments({ studentId: child.id }).then((res) => res.data)} reloadKey={child.id} />
    )}
  />
);

export default ParentAssignments;
