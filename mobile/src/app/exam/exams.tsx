import { Stack } from "expo-router";
import { ExamsList } from "@/features/admin/AdminScreens";

export default function ExamOfficerExams() {
  return (
    <>
      <Stack.Screen options={{ title: "Exams" }} />
      <ExamsList />
    </>
  );
}
