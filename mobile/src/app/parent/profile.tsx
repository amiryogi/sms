import { Stack } from "expo-router";
import { ParentGate } from "@/features/portal/ParentGate";
import { ProfileView } from "@/features/portal/ProfileView";

export default function ParentChildProfile() {
  return (
    <>
      <Stack.Screen options={{ title: "Child's profile" }} />
      <ParentGate>{(c) => <ProfileView studentId={c.studentId} />}</ParentGate>
    </>
  );
}
