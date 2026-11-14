import { DashboardView } from "@/features/portal/DashboardView";
import { ParentGate } from "@/features/portal/ParentGate";

export default function ParentHome() {
  return <ParentGate>{(c) => <DashboardView studentId={c.studentId} base="/parent" childName={c.firstName} />}</ParentGate>;
}
