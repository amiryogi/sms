import { View } from "react-native";
import { Stack } from "expo-router";
import { AppText, Badge, Card, Divider, QueryView, Screen, SectionHeader } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/utils/format";
import { useReceipt } from "./hooks";
import { METHOD_LABEL } from "./labels";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between gap-3 py-1.5">
    <AppText variant="muted">{label}</AppText>
    <AppText className="flex-1 text-right font-medium">{value}</AppText>
  </View>
);

/** One receipt (payment or reversal), as the ledger recorded it. Never editable. */
export const ReceiptView = ({ id }: { id: number }) => {
  const query = useReceipt(id);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "Receipt" }} />
      <QueryView query={query}>
        {(r) => (
          <>
            <Card className="items-center gap-1">
              <AppText variant="caption">{r.type === "REVERSAL" ? "Reversal" : "Payment received"}</AppText>
              <AppText variant="display" className={r.type === "REVERSAL" ? "text-red-600 dark:text-red-400" : undefined}>
                {r.type === "REVERSAL" ? "−" : ""}
                {formatMoney(r.amount)}
              </AppText>
              <AppText selectable className="font-mono text-sm">
                {r.receiptNumber}
              </AppText>
              {r.reversedBy ? <Badge label={`Reversed by ${r.reversedBy.receiptNumber}`} tone="neutral" /> : null}
            </Card>

            <SectionHeader title="Details" />
            <Card>
              {r.student ? <Row label="Student" value={fullName(r.student.user)} /> : null}
              {r.student?.admissionNumber ? <Row label="Admission no." value={r.student.admissionNumber} /> : null}
              {r.studentClass ? <Row label="Class" value={`${r.studentClass.class.name} ${r.studentClass.section.name}`} /> : null}
              <Row label="Paid on" value={formatDate(r.paidOn)} />
              <Row label="Method" value={METHOD_LABEL[r.method] ?? r.method} />
              {r.reference ? <Row label="Reference" value={r.reference} /> : null}
              {r.academicYear ? <Row label="Academic year" value={r.academicYear.name} /> : null}
              {r.recordedBy ? <Row label="Received by" value={fullName(r.recordedBy)} /> : null}
              <Row label="Recorded" value={formatDateTime(r.createdAt)} />
              {r.remarks ? <Row label="Remarks" value={r.remarks} /> : null}
            </Card>

            {r.allocations?.length ? (
              <>
                <SectionHeader title="Paid towards" />
                <Card>
                  {r.allocations.map((a, i) => (
                    <View key={`${a.installment.id}-${i}`}>
                      {i > 0 ? <Divider /> : null}
                      <Row label={`${a.installment.obligation.feeStructure.feeType.name} · ${a.installment.label}`} value={formatMoney(a.amount)} />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
};
