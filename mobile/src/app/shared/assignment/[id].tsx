import { useLocalSearchParams } from "expo-router";
import { AssignmentDetail } from "@/features/portal/AssignmentDetail";

export default function AssignmentRoute() {
  const { id, studentId } = useLocalSearchParams<{ id: string; studentId?: string }>();
  return <AssignmentDetail id={Number(id)} studentId={studentId ? Number(studentId) : null} />;
}
