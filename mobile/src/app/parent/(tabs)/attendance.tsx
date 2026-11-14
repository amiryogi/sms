import { AttendanceView } from "@/features/portal/AttendanceView";
import { ParentGate } from "@/features/portal/ParentGate";

export default function ParentAttendance() {
  return <ParentGate>{(c) => <AttendanceView studentId={c.studentId} />}</ParentGate>;
}
