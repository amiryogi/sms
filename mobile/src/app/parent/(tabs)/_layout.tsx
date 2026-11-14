import { Award, CalendarCheck, House, Menu, Wallet } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function ParentTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House },
        { name: "attendance", title: "Attendance", icon: CalendarCheck },
        { name: "results", title: "Results", icon: Award },
        { name: "fees", title: "Fees", icon: Wallet },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
