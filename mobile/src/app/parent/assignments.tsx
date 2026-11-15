import { Stack } from "expo-router";
import { AssignmentsView } from "@/features/portal/AssignmentsView";
import { ParentGate } from "@/features/portal/ParentGate";

export default function ParentAssignments() {
  return (
    <>
      <Stack.Screen options={{ title: "Assignments" }} />
      <ParentGate>{(c) => <AssignmentsView studentId={c.studentId} mode="parent" />}</ParentGate>
    </>
  );
}
