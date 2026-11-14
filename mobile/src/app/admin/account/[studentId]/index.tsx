import { useLocalSearchParams } from "expo-router";
import { AccountDetail } from "@/features/finance/FinanceScreens";

export default function AccountRoute() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <AccountDetail studentId={Number(studentId)} base="/admin" />;
}
