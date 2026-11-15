import { Stack } from "expo-router";
import { TransactionsList } from "@/features/finance/FinanceScreens";

export default function AdminTransactions() {
  return (
    <>
      <Stack.Screen options={{ title: "Transactions" }} />
      <TransactionsList />
    </>
  );
}
