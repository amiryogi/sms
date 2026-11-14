import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { BadgePercent, ReceiptText, Wallet } from "lucide-react-native";
import { AppText, Badge, Card, Chip, cn, Divider, EmptyState, ListItem, ProgressBar, QueryView, Screen, SectionHeader, StaleNote } from "@/components/ui";
import type { FeeStatement } from "@/types/api";
import { formatDate, formatMoney } from "@/utils/format";
import { useFeeStatement } from "./hooks";
import { FEE_STATUS, METHOD_LABEL } from "./labels";

/**
 * A student's fees as the school's ledger has them: balance, what is due by
 * when, receipts and approved discounts. Read-only: payments are made at the
 * school office. All amounts and totals come from the API.
 */
export const FeesView = ({ studentId, header }: { studentId: number; header?: (data: FeeStatement) => ReactNode }) => {
  const query = useFeeStatement(studentId);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      {header && query.data ? header(query.data) : null}
      <QueryView query={query}>{(data) => <Statement data={data} />}</QueryView>
      <StaleNote updatedAt={query.dataUpdatedAt} isStale={query.fetchStatus === "paused"} />
    </Screen>
  );
};

const Statement = ({ data }: { data: FeeStatement }) => {
  const [yearId, setYearId] = useState<number | null>(null);
  const year =
    data.years.find((y) => y.academicYear.id === yearId) ?? data.years.find((y) => y.academicYear.isCurrent) ?? data.years[0];

  if (!year || year.fees.length === 0) {
    return <EmptyState icon={Wallet} title="No fees yet" message="The school has not set up fees for this year yet." />;
  }

  const t = year.totals;
  const due = t.amount - t.discount;
  const paidPct = due > 0 ? (t.paid / due) * 100 : 100;
  const receipts = data.transactions.filter((x) => x.academicYear?.id === year.academicYear.id);
  const discounts = data.discounts.filter((d) => d.academicYearId === year.academicYear.id && d.status === "APPROVED");
  const status = FEE_STATUS[year.status];

  return (
    <>
      {data.years.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-3">
          {data.years.map((y) => (
            <Chip key={y.academicYear.id} label={y.academicYear.name} selected={y.academicYear.id === year.academicYear.id} onPress={() => setYearId(y.academicYear.id)} />
          ))}
        </ScrollView>
      ) : null}

      <Card className="gap-2">
        <View className="flex-row items-start justify-between">
          <View>
            <AppText variant="caption">Balance · {year.academicYear.name}</AppText>
            <AppText variant="display">{formatMoney(t.balance)}</AppText>
            {t.overdue > 0 ? <AppText className="text-sm font-medium text-bad">{formatMoney(t.overdue)} is overdue</AppText> : null}
          </View>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <ProgressBar value={paidPct} tone="success" label={`${Math.round(paidPct)}% paid`} />
        <AppText variant="muted">
          {formatMoney(t.paid)} paid of {formatMoney(due)}
          {t.discount > 0 ? ` (after ${formatMoney(t.discount)} discount)` : ""}
        </AppText>
        <AppText variant="caption">Pay at the school office. You get a receipt for every payment.</AppText>
      </Card>

      <SectionHeader title="Fees and due dates" />
      <View className="gap-3">
        {year.fees.map((f) => (
          <Card key={f.id} className={cn("gap-2", f.cancelled && "opacity-60")}>
            <View className="flex-row items-center justify-between">
              <AppText className="font-semibold">{f.feeType.name}</AppText>
              <AppText className="font-semibold">{formatMoney(f.amount)}</AppText>
            </View>
            {f.cancelled ? <Badge label={`Cancelled${f.cancelReason ? `: ${f.cancelReason}` : ""}`} tone="neutral" /> : null}
            {f.installments.map((i) => (
              <View key={i.id} className="flex-row items-center justify-between gap-2 border-t border-line pt-2">
                <View className="flex-1">
                  <AppText className="text-sm">{i.label}</AppText>
                  <AppText variant="caption" className={i.overdue ? "text-bad" : undefined}>
                    {i.dueDate ? `${i.overdue ? "Was due" : "Due"} ${formatDate(i.dueDate, "bs")}` : "No due date"}
                  </AppText>
                </View>
                <View className="items-end">
                  {i.balance > 0 ? (
                    <AppText className="text-sm font-semibold">{formatMoney(i.balance)} left</AppText>
                  ) : (
                    <Badge label="Paid" tone="success" />
                  )}
                  {i.discount > 0 ? <AppText variant="caption">−{formatMoney(i.discount)} discount</AppText> : null}
                </View>
              </View>
            ))}
          </Card>
        ))}
      </View>

      <SectionHeader title="Receipts" />
      <Card className="p-0">
        {receipts.length ? (
          receipts.map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <Divider inset /> : null}
              <ListItem
                icon={ReceiptText}
                title={r.receiptNumber}
                subtitle={`${formatDate(r.paidOn, "bs")} · ${METHOD_LABEL[r.method] ?? r.method}`}
                right={
                  <View className="items-end">
                    <AppText className={cn("font-semibold", r.type === "REVERSAL" && "text-bad")}>
                      {r.type === "REVERSAL" ? "−" : ""}
                      {formatMoney(r.amount)}
                    </AppText>
                    {r.type === "REVERSAL" ? <Badge label="Reversal" tone="danger" /> : r.reversedBy ? <Badge label="Reversed" tone="neutral" /> : null}
                  </View>
                }
                onPress={() => router.push(`/shared/receipt/${r.id}`)}
              />
            </View>
          ))
        ) : (
          <AppText variant="muted" className="p-4">
            No payments recorded for this year.
          </AppText>
        )}
      </Card>

      {discounts.length ? (
        <>
          <SectionHeader title="Discounts and scholarships" />
          <Card className="p-0">
            {discounts.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <Divider inset /> : null}
                <ListItem
                  icon={BadgePercent}
                  title={d.name}
                  subtitle={d.kind === "PERCENT" ? `${Number(d.value)}%` : formatMoney(d.value)}
                  right={<AppText className="font-semibold text-ok">−{formatMoney(d.appliedAmount)}</AppText>}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
};
