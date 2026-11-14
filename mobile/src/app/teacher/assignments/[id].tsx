import { useLocalSearchParams } from "expo-router";
import { TeacherAssignmentDetail } from "@/features/teacher/TeacherAssignments";

export default function TeacherAssignmentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeacherAssignmentDetail id={Number(id)} />;
}
