import { CalendarCheck, ClipboardList, House, Menu, PenLine } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function TeacherTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House },
        { name: "attendance", title: "Attendance", icon: CalendarCheck },
        { name: "marks", title: "Marks", icon: PenLine },
        { name: "assignments", title: "Assignments", icon: ClipboardList },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
