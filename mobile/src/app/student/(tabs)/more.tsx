import { Megaphone, UserRound, Wallet } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function StudentMore() {
  return (
    <MoreScreen
      area="student"
      links={[
        { title: "Fees", subtitle: "Balance, due dates and receipts", icon: Wallet, href: "/student/fees" },
        { title: "Notices", icon: Megaphone, href: "/student/notices" },
        { title: "My profile", icon: UserRound, href: "/student/profile" },
      ]}
    />
  );
}
