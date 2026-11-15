import { Stack } from "expo-router";
import { MarksHome } from "@/features/teacher/MarksHome";

export default function AdminMarks() {
  return (
    <>
      <Stack.Screen options={{ title: "Marks entry" }} />
      <MarksHome mode="officer" />
    </>
  );
}
