import { Award, CalendarCheck, ClipboardList, House, Menu } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function StudentTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House },
        { name: "attendance", title: "Attendance", icon: CalendarCheck },
        { name: "assignments", title: "Assignments", icon: ClipboardList },
        { name: "results", title: "Results", icon: Award },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
