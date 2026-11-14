import { GraduationCap, House, Menu, PenLine } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function ExamTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House },
        { name: "marks", title: "Marks", icon: PenLine },
        { name: "students", title: "Students", icon: GraduationCap },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
