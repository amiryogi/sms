import { BookOpen, Megaphone } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function ExamMore() {
  return (
    <MoreScreen
      area="exam"
      links={[
        { title: "Exams", subtitle: "Exams this year and their state", icon: BookOpen, href: "/exam/exams" },
        { title: "Notices", icon: Megaphone, href: "/exam/notices" },
      ]}
    />
  );
}
