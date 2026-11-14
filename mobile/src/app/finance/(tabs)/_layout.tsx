import { House, Menu, ReceiptText, Wallet } from "lucide-react-native";
import { AreaTabs } from "@/navigation/AreaTabs";

export default function FinanceTabs() {
  return (
    <AreaTabs
      tabs={[
        { name: "index", title: "Home", icon: House, headerTitle: "Finance" },
        { name: "accounts", title: "Accounts", icon: Wallet },
        { name: "transactions", title: "Transactions", icon: ReceiptText },
        { name: "more", title: "More", icon: Menu },
      ]}
    />
  );
}
