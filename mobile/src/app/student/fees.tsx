import { Stack } from "expo-router";
import { FeesView } from "@/features/portal/FeesView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentFees() {
  return (
    <>
      <Stack.Screen options={{ title: "Fees" }} />
      <StudentGate>{(id) => <FeesView studentId={id} />}</StudentGate>
    </>
  );
}
