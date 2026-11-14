import { BookOpen, GraduationCap, House, Menu, Wallet } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function AdminTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House },
        { name: "students", title: "Students", icon: GraduationCap },
        { name: "exams", title: "Exams", icon: BookOpen },
        { name: "finance", title: "Finance", icon: Wallet },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
