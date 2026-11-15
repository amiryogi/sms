import { useLocalSearchParams } from "expo-router";
import { ReportCardScreen } from "@/features/report-cards/ReportCardScreen";

export default function ReportCardRoute() {
  const { studentId, examId } = useLocalSearchParams<{ studentId: string; examId: string }>();
  return <ReportCardScreen studentId={Number(studentId)} examId={Number(examId)} />;
}
