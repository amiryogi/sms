import { useLocalSearchParams } from "expo-router";
import { ExamReportCards } from "@/features/admin/AdminScreens";

export default function AdminExamRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExamReportCards examId={Number(id)} />;
}
