import { useLocalSearchParams } from "expo-router";
import { MarksEntryScreen } from "@/features/teacher/MarksEntryScreen";

/** Marks entry for one exam subject and section (teacher, exam officer, admin: the API decides). */
export default function MarksRoute() {
  const { examSubjectId, sectionId, title, exam } = useLocalSearchParams<{ examSubjectId: string; sectionId: string; title?: string; exam?: string }>();
  return <MarksEntryScreen examSubjectId={Number(examSubjectId)} sectionId={Number(sectionId)} title={title} examName={exam} />;
}
