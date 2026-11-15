import { useLocalSearchParams } from "expo-router";
import { RecordPaymentScreen } from "@/features/finance/FinanceScreens";

export default function PayRoute() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <RecordPaymentScreen studentId={Number(studentId)} />;
}
