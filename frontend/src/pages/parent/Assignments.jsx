import React from "react";
import { assignmentService } from "../../api/assignmentService";
import ParentPage from "../../components/portal/ParentPage";
import AssignmentsView from "../../components/portal/AssignmentsView";

/** A linked child's assignments and hand-ins, read-only (?studentId scopes the API to that child). */
const ParentAssignments = () => (
  <ParentPage
    title="Assignments"
    description="Work set for your child, what was handed in, marks and feedback."
    render={(child) => (
      <AssignmentsView load={() => assignmentService.getAssignments({ studentId: child.id }).then((res) => res.data)} reloadKey={child.id} />
    )}
  />
);

export default ParentAssignments;
