import { ParentGate } from "@/features/portal/ParentGate";
import { ResultsView } from "@/features/portal/ResultsView";

export default function ParentResults() {
  return <ParentGate>{(c) => <ResultsView studentId={c.studentId} />}</ParentGate>;
}
