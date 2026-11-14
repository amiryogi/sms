import { Stack } from "expo-router";
import { ProfileView } from "@/features/portal/ProfileView";
import { StudentGate } from "@/features/portal/StudentGate";

export default function StudentProfile() {
  return (
    <>
      <Stack.Screen options={{ title: "My profile" }} />
      <StudentGate>{(id) => <ProfileView studentId={id} />}</StudentGate>
    </>
  );
}
