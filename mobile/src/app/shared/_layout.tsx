import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screenOptions";

/** Detail screens several roles open (notice, report card, receipt, notifications, about). */
export default function SharedLayout() {
  const options = useStackScreenOptions();
  return <Stack screenOptions={options} />;
}
