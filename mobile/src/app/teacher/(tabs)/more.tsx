import { Megaphone, Users } from "lucide-react-native";
import { MoreScreen } from "@/features/profile/MoreScreen";

export default function TeacherMore() {
  return (
    <MoreScreen
      area="teacher"
      links={[
        { title: "My students", subtitle: "Your sections this year", icon: Users, href: "/teacher/students" },
        { title: "Notices", icon: Megaphone, href: "/teacher/notices" },
      ]}
    />
  );
}
