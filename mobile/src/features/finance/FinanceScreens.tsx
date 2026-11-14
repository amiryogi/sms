import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import * as Crypto from "expo-crypto";
import { useNetworkState } from "expo-network";
import { AlertTriangle, BarChart3, HandCoins, ReceiptText, TrendingUp, Wallet } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import {
  AppText,
  Avatar,
  Badge,
  BarChart,
  BreakdownBars,
  Button,
  Card,
  Chip,
  DateField,
  Divider,
  EmptyState,
  ErrorState,
  ListItem,
  OfflineBanner,
  PressableCard,
  QueryView,
  Screen,
  SectionHeader,
  SkeletonList,
  StaleNote,
  StatCard,
  TextField,
} from "@/components/ui";
import { FEE_STATUS, METHOD_LABEL } from "@/features/portal/labels";
import { FeesView } from "@/features/portal/FeesView";
import { useFeeStatement } from "@/features/portal/hooks";
import type { FeeStatement, PaymentMethod } from "@/types/api";
import type { AccountRow, ReportName } from "@/types/admin";
import { resolveAssetUrl } from "@/utils/assets";
import { formatDate, formatMoney, formatPercent, fullName } from "@/utils/format";
import { kathmanduToday } from "@/utils/nepaliDate";
import { useAccounts, useFinanceDashboard, useRecordPayment, useReport, useTransactions } from "@/features/admin/hooks";

/* ------------------------------------------------------------- dashboard */

/** KPIs and charts exactly as GET /fees/dashboard computes them. */
export const FinanceDashboardView = ({ base }: { base: string }) => {
  const query = useFinanceDashboard();
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <QueryView query={query}>
        {(d) => {
          const k = d.kpis;
          return (
            <>
              <AppText variant="caption">Academic year {d.academicYear.name}</AppText>
              <View className="mt-2 flex-row gap-3">
                <StatCard icon={HandCoins} label="Collected" value={formatMoney(k.collected)} hint={`${formatPercent(k.collectionRate)} of ${formatMoney(k.expectedNet)}`} tone="success" />
                <StatCard icon={Wallet} label="Outstanding" value={formatMoney(k.outstanding)} hint={`${k.pending.installments} installment(s)`} tone="warning" />
              </View>
              <View className="mt-3 flex-row gap-3">
                <StatCard icon={TrendingUp} label="Today" value={formatMoney(k.today)} hint={`${k.thisMonth.label}: ${formatMoney(k.thisMonth.amount)}`} />
                <StatCard icon={AlertTriangle} label="Overdue" value={formatMoney(k.overdue.amount)} hint={`${k.overdue.students} student(s)`} tone="danger" />
              </View>

              {d.series.monthly.length ? (
                <>
                  <SectionHeader title="Collected by month" />
                  <Card>
                    <BarChart
                      label="Collections by Nepali month"
                      data={d.series.monthly.slice(-6).map((m) => ({ key: m.key, label: m.label.split(" ")[0] ?? m.label, value: m.amount }))}
                      format={formatMoney}
                    />
                  </Card>
                </>
              ) : null}

              {d.series.byClass.length ? (
                <>
                  <SectionHeader title="By class" />
                  <Card>
                    <BreakdownBars rows={d.series.byClass.map((c) => ({ key: c.key, label: c.label, value: c.collected, total: c.expected }))} format={formatMoney} />
                  </Card>
                </>
              ) : null}

              {d.overdueStudents.length ? (
                <>
                  <SectionHeader title="Most overdue" />
                  <Card className="p-0">
                    {d.overdueStudents.slice(0, 5).map((s, i) => (
                      <View key={s.studentId}>
                        {i > 0 ? <Divider className="ml-16" /> : null}
                        <ListItem
                          left={<Avatar name={s.name} uri={resolveAssetUrl(s.avatarUrl)} size={36} />}
                          title={s.name}
                          subtitle={`${s.class.name} ${s.section.name}`}
                          right={<AppText className="font-semibold text-red-600 dark:text-red-400">{formatMoney(s.overdue)}</AppText>}
                          onPress={() => router.push(`${base}/account/${s.studentId}` as Href)}
                        />
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              <SectionHeader title="Latest payments" />
              <Card className="p-0">
                {d.recentTransactions.length ? (
                  d.recentTransactions.slice(0, 5).map((t, i) => (
                    <View key={t.id}>
                      {i > 0 ? <Divider className="ml-16" /> : null}
                      <ListItem
                        icon={ReceiptText}
                        title={t.student ? fullName(t.student.user) : t.receiptNumber}
                        subtitle={`${t.receiptNumber} · ${formatDate(t.paidOn, "bs")}`}
                        right={<AppText className="font-semibold">{t.type === "REVERSAL" ? "−" : ""}{formatMoney(t.amount)}</AppText>}
                        onPress={() => router.push(`/shared/receipt/${t.id}`)}
                      />
                    </View>
                  ))
                ) : (
                  <AppText variant="muted" className="p-4">
                    No payments yet.
                  </AppText>
                )}
              </Card>
              <StaleNote updatedAt={query.dataUpdatedAt} isStale={query.fetchStatus === "paused"} />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
};

/* -------------------------------------------------------------- accounts */

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "partial", label: "Partly paid" },
  { value: "pending", label: "Due" },
  { value: "paid", label: "Paid" },
];

export const AccountsList = ({ base }: { base: string }) => {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);
  const query = useAccounts(search, status);
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <OfflineBanner />
      <View className="gap-2 px-4 pt-4">
        <TextField label="Search students" value={text} onChangeText={setText} placeholder="Name or admission number" returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ScrollView>
      </View>
      {query.data === undefined ? (
        <View className="p-4">{query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList />}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.studentClassId)}
          contentContainerClassName="gap-2 p-4 pb-10"
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : undefined}
          ListEmptyComponent={<EmptyState icon={Wallet} title="No accounts match" />}
          renderItem={({ item }) => <AccountCard row={item} onPress={() => router.push(`${base}/account/${item.studentId}` as Href)} />}
        />
      )}
    </View>
  );
};

const AccountCard = ({ row, onPress }: { row: AccountRow; onPress: () => void }) => {
  const status = FEE_STATUS[row.status];
  return (
    <PressableCard className="flex-row items-center gap-3" onPress={onPress}>
      <Avatar name={row.name} uri={resolveAssetUrl(row.avatarUrl)} size={40} />
      <View className="flex-1">
        <AppText className="font-semibold" numberOfLines={1}>
          {row.name}
        </AppText>
        <AppText variant="caption">
          {row.class.name} {row.section.name}
          {row.rollNumber ? ` · Roll ${row.rollNumber}` : ""}
          {row.admissionNumber ? ` · ${row.admissionNumber}` : ""}
        </AppText>
      </View>
      <View className="items-end gap-1">
        <AppText className="font-semibold">{formatMoney(row.balance)}</AppText>
        <Badge label={status.label} tone={status.tone} />
      </View>
    </PressableCard>
  );
};

/** One student's statement for fee staff, with Record payment. */
export const AccountDetail = ({ studentId, base }: { studentId: number; base: string }) => (
  <>
    <Stack.Screen options={{ title: "Account" }} />
    <FeesView
      studentId={studentId}
      header={(s: FeeStatement) => {
        const current = s.years.find((y) => y.academicYear.isCurrent) ?? s.years[0];
        return (
          <View className="mb-3 gap-3">
            <AppText variant="title">{s.student.name}</AppText>
            {s.student.admissionNumber ? <AppText variant="muted">{s.student.admissionNumber}</AppText> : null}
            {current && current.totals.balance > 0 ? (
              <Button title="Record payment" icon={HandCoins} onPress={() => router.push(`${base}/account/${studentId}/pay` as Href)} />
            ) : null}
          </View>
        );
      }}
    />
  </>
);

/* --------------------------------------------------------- record payment */

const METHODS: PaymentMethod[] = ["cash", "bank_transfer", "wallet", "cheque", "card"];
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

/**
 * Record a payment. The server allocates it to the oldest dues first, refuses
 * more than is owed, and writes an append-only ledger row; mistakes are undone
 * by a reversal on the web, never by editing. One idempotency key per form,
 * so a retry after a lost connection can't record the payment twice.
 */
export const RecordPaymentScreen = ({ studentId }: { studentId: number }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paidOn, setPaidOn] = useState<string | null>(kathmanduToday());
  const [error, setError] = useState<string | null>(null);
  const [key] = useState(() => Crypto.randomUUID());
  const sending = useRef(false);
  const pay = useRecordPayment();
  const offline = useNetworkState().isConnected === false;
  const statement = useStatementBalance(studentId);

  const submit = () => {
    if (sending.current) return;
    const value = amount.trim();
    if (!TWO_DECIMALS.test(value) || Number(value) <= 0) return setError("Enter an amount more than 0, with at most 2 decimals.");
    if (statement.balance !== null && Number(value) > statement.balance) return setError(`That is more than the balance of ${formatMoney(statement.balance)}.`);
    if (method !== "cash" && !reference.trim()) return setError("Add the cheque, transfer or wallet reference.");
    setError(null);
    Alert.alert("Record this payment?", `${formatMoney(value)} by ${METHOD_LABEL[method]} for ${statement.name ?? "this student"}.\nIt can only be undone by a reversal.`, [
      { text: "Check again", style: "cancel" },
      {
        text: "Record",
        onPress: () => {
          sending.current = true;
          pay.mutate(
            { studentId, amount: value, method, reference: reference.trim() || undefined, remarks: remarks.trim() || undefined, paidOn: paidOn ?? undefined, idempotencyKey: key },
            {
              onSuccess: ({ data }) => router.replace(`/shared/receipt/${data.id}`),
              onError: (e) => setError((e as ApiFailure).message),
              onSettled: () => {
                sending.current = false;
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Record payment" }} />
      <View className="gap-4">
        <Card>
          <AppText variant="caption">{statement.name ?? "Student"}</AppText>
          <AppText variant="title">{statement.balance !== null ? formatMoney(statement.balance) : "—"}</AppText>
          <AppText variant="caption">Balance this year. The payment goes to the oldest dues first.</AppText>
        </Card>
        <TextField label="Amount (Rs.)" value={amount} onChangeText={(v) => setAmount(v.replace(",", "."))} keyboardType="decimal-pad" maxLength={12} />
        <View className="gap-1.5">
          <AppText variant="label">Paid by</AppText>
          <View className="flex-row flex-wrap gap-2">
            {METHODS.map((m) => (
              <Chip key={m} label={METHOD_LABEL[m]} selected={m === method} onPress={() => setMethod(m)} />
            ))}
          </View>
        </View>
        {method !== "cash" ? <TextField label="Reference" value={reference} onChangeText={setReference} maxLength={100} /> : null}
        <DateField label="Paid on" value={paidOn} onChange={setPaidOn} maximumDate={kathmanduToday()} />
        <TextField label="Remarks (optional)" value={remarks} onChangeText={setRemarks} maxLength={500} />
        {error ? (
          <AppText accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </AppText>
        ) : null}
        {offline ? <AppText variant="caption">You&apos;re offline. Payments are recorded only online.</AppText> : null}
        <Button title="Record payment" icon={HandCoins} loading={pay.isPending} disabled={offline || pay.isPending} onPress={submit} fullWidth />
      </View>
    </Screen>
  );
};

/** The current year's balance and the student's name, from the statement. */
const useStatementBalance = (studentId: number) => {
  // The portal statement query (same key), so it is usually cached already.
  const q = useFeeStatement(studentId);
  return useMemo(() => {
    const y = q.data?.years.find((x) => x.academicYear.isCurrent) ?? q.data?.years[0];
    return { name: q.data?.student.name ?? null, balance: y ? y.totals.balance : null };
  }, [q.data]);
};

/* ----------------------------------------------------------- transactions */

export const TransactionsList = () => {
  const [type, setType] = useState<"" | "PAYMENT" | "REVERSAL">("");
  const [day, setDay] = useState<string | null>(null);
  const query = useTransactions({ type: type || undefined, from: day ?? undefined, to: day ?? undefined });
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <OfflineBanner />
      <View className="gap-2 px-4 pt-4">
        <View className="flex-row flex-wrap gap-2">
          <Chip label="All" selected={type === ""} onPress={() => setType("")} />
          <Chip label="Payments" selected={type === "PAYMENT"} onPress={() => setType("PAYMENT")} />
          <Chip label="Reversals" selected={type === "REVERSAL"} onPress={() => setType("REVERSAL")} />
        </View>
        <DateField label="Day (optional)" value={day} onChange={setDay} maximumDate={kathmanduToday()} optional />
      </View>
      {query.data === undefined ? (
        <View className="p-4">{query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList />}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(t) => String(t.id)}
          contentContainerClassName="gap-2 p-4 pb-10"
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : undefined}
          ListEmptyComponent={<EmptyState icon={ReceiptText} title="No transactions" />}
          renderItem={({ item: t }) => (
            <PressableCard className="flex-row items-center gap-3" onPress={() => router.push(`/shared/receipt/${t.id}`)}>
              <View className="flex-1">
                <AppText className="font-semibold" numberOfLines={1}>
                  {t.student ? fullName(t.student.user) : "—"}
                </AppText>
                <AppText variant="caption">
                  {t.receiptNumber} · {formatDate(t.paidOn, "bs")} · {METHOD_LABEL[t.method] ?? t.method}
                </AppText>
              </View>
              <View className="items-end gap-1">
                <AppText className={t.type === "REVERSAL" ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold"}>
                  {t.type === "REVERSAL" ? "−" : ""}
                  {formatMoney(t.amount)}
                </AppText>
                {t.type === "REVERSAL" ? <Badge label="Reversal" tone="danger" /> : t.reversedBy ? <Badge label="Reversed" tone="neutral" /> : null}
              </View>
            </PressableCard>
          )}
        />
      )}
    </View>
  );
};

/* ---------------------------------------------------------------- reports */

const REPORTS: { name: ReportName; label: string }[] = [
  { name: "collections", label: "Collections" },
  { name: "outstanding", label: "Outstanding" },
  { name: "discounts", label: "Discounts" },
  { name: "reversals", label: "Reversals" },
];

const cell = (value: unknown, type?: string) => {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return formatMoney(value as number);
  if (type === "percent") return formatPercent(value as number);
  if (type === "date") return formatDate(value as string, "bs");
  return String(value);
};

/** The web's finance reports as cards (the API computes rows and totals). */
export const ReportsView = () => {
  const [name, setName] = useState<ReportName>("collections");
  const query = useReport(name, name === "collections" ? { groupBy: "month" } : {});
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "Reports" }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-3">
        {REPORTS.map((r) => (
          <Chip key={r.name} label={r.label} selected={r.name === name} onPress={() => setName(r.name)} />
        ))}
      </ScrollView>
      <QueryView query={query} isEmpty={(r) => r.rows.length === 0} empty={<EmptyState icon={BarChart3} title="Nothing in this report yet" />}>
        {(r) => {
          const [first, ...rest] = r.columns;
          return (
            <>
              <AppText variant="heading">{r.title}</AppText>
              {r.subtitle ? <AppText variant="muted">{r.subtitle}</AppText> : null}
              <View className="mt-3 gap-2">
                {r.rows.map((row, i) => (
                  <Card key={i} className="gap-1">
                    <AppText className="font-semibold">{first ? cell(row[first.key], first.type) : ""}</AppText>
                    {rest.map((c) => (
                      <View key={c.key} className="flex-row justify-between gap-2">
                        <AppText variant="muted">{c.label}</AppText>
                        <AppText className="text-sm">{cell(row[c.key], c.type)}</AppText>
                      </View>
                    ))}
                  </Card>
                ))}
                {r.totals ? (
                  <Card className="gap-1 border-brand-200 dark:border-brand-800">
                    <AppText className="font-semibold">Total</AppText>
                    {rest
                      .filter((c) => r.totals?.[c.key] !== undefined)
                      .map((c) => (
                        <View key={c.key} className="flex-row justify-between gap-2">
                          <AppText variant="muted">{c.label}</AppText>
                          <AppText className="text-sm font-semibold">{cell(r.totals?.[c.key], c.type)}</AppText>
                        </View>
                      ))}
                  </Card>
                ) : null}
              </View>
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
};
