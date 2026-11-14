import { AttendanceView } from "@/features/portal/AttendanceView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentAttendance() {
  return <StudentGate>{(id) => <AttendanceView studentId={id} />}</StudentGate>;
}
