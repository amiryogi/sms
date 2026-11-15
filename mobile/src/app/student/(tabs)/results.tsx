import { ResultsView } from "@/features/portal/ResultsView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentResults() {
  return <StudentGate>{(id) => <ResultsView studentId={id} />}</StudentGate>;
}
