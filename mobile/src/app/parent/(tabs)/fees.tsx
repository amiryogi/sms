import { FeesView } from "@/features/portal/FeesView";
import { ParentGate } from "@/features/portal/ParentGate";

export default function ParentFees() {
  return <ParentGate>{(c) => <FeesView studentId={c.studentId} />}</ParentGate>;
}
