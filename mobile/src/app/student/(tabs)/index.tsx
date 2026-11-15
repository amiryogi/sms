import { DashboardView } from "@/features/portal/DashboardView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentHome() {
  return <StudentGate>{(id) => <DashboardView studentId={id} base="/student" />}</StudentGate>;
}
