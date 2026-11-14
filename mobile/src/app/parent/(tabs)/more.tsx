import { ClipboardList, Megaphone, UserRound } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function ParentMore() {
  return (
    <MoreScreen
      area="parent"
      links={[
        { title: "Assignments", subtitle: "Homework and hand-in status", icon: ClipboardList, href: "/parent/assignments" },
        { title: "Notices", icon: Megaphone, href: "/parent/notices" },
        { title: "Child's profile", icon: UserRound, href: "/parent/profile" },
      ]}
    />
  );
}
