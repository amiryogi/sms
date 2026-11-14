import { DashboardView } from "@/features/portal/DashboardView";
import { ChildSwitcher, ParentGate } from "@/features/portal/ParentGate";

export default function ParentHome() {
  return (
    <ParentGate switcher={false}>
      {(c) => <DashboardView studentId={c.studentId} base="/parent" childName={c.firstName} heroExtra={<ChildSwitcher variant="hero" />} />}
    </ParentGate>
  );
}
