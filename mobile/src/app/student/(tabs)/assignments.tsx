import { AssignmentsView } from "@/features/portal/AssignmentsView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentAssignments() {
  return <StudentGate>{(id) => <AssignmentsView studentId={id} mode="student" />}</StudentGate>;
}
