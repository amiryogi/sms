import { BarChart3, Megaphone } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function FinanceMore() {
  return (
    <MoreScreen
      area="finance"
      links={[
        { title: "Reports", subtitle: "Collections, outstanding, discounts, reversals", icon: BarChart3, href: "/finance/reports" },
        { title: "Notices", icon: Megaphone, href: "/finance/notices" },
      ]}
    />
  );
}
