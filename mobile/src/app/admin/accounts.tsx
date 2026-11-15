import { Stack } from "expo-router";
import { AccountsList } from "@/features/finance/FinanceScreens";

export default function AdminAccounts() {
  return (
    <>
      <Stack.Screen options={{ title: "Fee accounts" }} />
      <AccountsList base="/admin" />
    </>
  );
}
