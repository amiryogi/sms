import { BarChart3, Megaphone, PenLine, ReceiptText, School, Settings, Users, Wallet } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function AdminMore() {
  return (
    <MoreScreen
      area="admin"
      links={[
        { title: "Fee accounts", subtitle: "Balances and record payments", icon: Wallet, href: "/admin/accounts" },
        { title: "Transactions", icon: ReceiptText, href: "/admin/transactions" },
        { title: "Finance reports", icon: BarChart3, href: "/admin/reports" },
        { title: "Marks entry", subtitle: "Any subject of a published exam", icon: PenLine, href: "/admin/marks" },
        { title: "Staff", icon: Users, href: "/admin/staff" },
        { title: "Classes", icon: School, href: "/admin/classes" },
        { title: "School profile", icon: Settings, href: "/admin/school" },
        { title: "Notices", icon: Megaphone, href: "/admin/notices" },
      ]}
    />
  );
}
