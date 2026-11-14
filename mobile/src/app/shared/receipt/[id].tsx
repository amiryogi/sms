import { useLocalSearchParams } from "expo-router";
import { ReceiptView } from "@/features/portal/ReceiptView";

export default function ReceiptRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReceiptView id={Number(id)} />;
}
