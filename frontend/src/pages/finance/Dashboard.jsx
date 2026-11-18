import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Wallet, AlertTriangle, CalendarDays, Coins, HandCoins, FileSpreadsheet, ArrowRight, RotateCw } from "lucide-react";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { PageHeader, PageShell, Card, CardHeader, Button, SelectInput, NepaliDatePicker, Skeleton, EmptyState, Avatar, Badge, StatCard, StatGroup, toast, buttonClasses } from "../../components/ui";
import { DailyCollectionChart, MonthlyCollectionChart, CollectedVsOutstandingChart, FeeStateBar, OverdueTrendChart } from "../../components/finance/charts/FinanceCharts";
import { PAYMENT_METHODS, methodLabel, fullName } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate } from "../../utils/format";

/**
 * Finance overview for accountants and admins: what the school expects this
 * year, what has come in, what is still owed and overdue. Every figure comes
 * from GET /fees/dashboard (the ledger); nothing is estimated here.
 */
const FinanceDashboard = () => {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: "", classId: "", feeTypeId: "", method: "", from: "", to: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState(null); // filters of the data on screen

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), academicService.getClasses(), feeService.getFeeTypes()])
      .then(([y, c, t]) => {
        setYears(y.data || []);
        setClasses(c.data || []);
        setFeeTypes(t.data || []);
      })
      .catch(() => toast.error("Could not load filter options"));
  }, []);

  const filtersKey = JSON.stringify(filters);
  const loading = loadedKey !== filtersKey;

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const key = JSON.stringify(filters);
    return feeService
      .getDashboard(params)
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load the dashboard"))
      .finally(() => setLoadedKey(key));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Boolean(filters.classId || filters.feeTypeId || filters.method);
  const k = data?.kpis;
  const s = data?.series;

  return (
    <PageShell>
      <PageHeader
        icon={LayoutDashboard}
        title="Finance overview"
        description={data ? `${data.academicYear.name}${data.academicYear.isCurrent ? " (current year)" : ""}, as of ${formatDate(data.today)}` : "Fees expected, collected and owed"}
        actions={
          <>
            <Link to="/finance/reports" className={buttonClasses({ variant: "secondary" })}>
              <FileSpreadsheet size={16} aria-hidden="true" /> Reports
            </Link>
            <Link to="/finance/collect" className={buttonClasses()}>
              <HandCoins size={16} aria-hidden="true" /> Collect fees
            </Link>
          </>
        }
      />

      {/* Filters: one row above the charts */}
      <Card padding="sm">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SelectInput aria-label="Academic year" value={filters.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}>
            <option value="">Current year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Class" value={filters.classId} onChange={(e) => set("classId", e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Fee type" value={filters.feeTypeId} onChange={(e) => set("feeTypeId", e.target.value)}>
            <option value="">All fee types</option>
            {feeTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Payment method" value={filters.method} onChange={(e) => set("method", e.target.value)}>
            <option value="">Any method</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{methodLabel(m.value)}</option>
            ))}
          </SelectInput>
          <NepaliDatePicker aria-label="Collections from" value={filters.from} max={filters.to || undefined} onChange={(ad) => set("from", ad)} placeholder="From (last 30 days)" className="w-full" />
          <NepaliDatePicker aria-label="Collections to" value={filters.to} min={filters.from || undefined} onChange={(ad) => set("to", ad)} placeholder="To (today)" className="w-full" />
        </div>
        {(filtered || filters.from || filters.to) && (
          <p className="mt-2 text-xs text-slate-500">
            Class and fee type filter everything. Method and dates filter money received only; amounts owed are for the whole year.
            <button type="button" className="ml-2 cursor-pointer font-medium text-brand-700 hover:underline" onClick={() => setFilters((f) => ({ ...f, classId: "", feeTypeId: "", method: "", from: "", to: "" }))}>
              Clear filters
            </button>
          </p>
        )}
      </Card>

      {error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Dashboard unavailable" description={error} action={<Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>} />
        </Card>
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          {/* Headline numbers. Ink unless the figure is itself a status. The
              collection bar is a token, not the chart series colour. */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Collected this year"
              value={formatCurrency(k.collected)}
              progress={k.collectionRate}
              progressLabel={`Collected: ${k.collectionRate}% of expected`}
              sub={`${k.collectionRate}% of ${formatCurrency(k.expectedNet)} expected`}
            />
            <StatCard
              icon={Coins}
              label="Still owed"
              value={formatCurrency(k.outstanding)}
              sub={
                k.overdue.amount > 0 ? (
                  <>
                    <span className="font-medium text-risk">{formatCurrency(k.overdue.amount)} overdue</span>
                    {` from ${k.overdue.students} student${k.overdue.students === 1 ? "" : "s"}`}
                  </>
                ) : (
                  "Nothing overdue"
                )
              }
            />
            <StatCard
              icon={HandCoins}
              label="Today"
              value={k.today < 0 ? `−${formatCurrency(-k.today)}` : formatCurrency(k.today)}
              tone={k.today < 0 ? "risk" : "ink"}
              sub={k.today < 0 ? "Reversals exceeded payments today" : "Net of reversals"}
            />
            <StatCard
              icon={CalendarDays}
              label="This month"
              value={formatCurrency(k.thisMonth.amount)}
              sub={`${k.thisMonth.label}, ${formatDate(k.thisMonth.from)} – ${formatDate(k.thisMonth.to)}`}
            />
          </div>

          {/* Secondary figures, ruled into one strip */}
          <StatGroup columns={4} size="sm" className="mt-4">
            <StatCard label="Expected (gross)" value={formatCurrency(k.expectedGross)} sub={`${formatCurrency(k.discounts)} in discounts`} />
            <StatCard label="Not yet due" value={formatCurrency(k.pending.amount)} sub={`${k.pending.installments} installments`} />
            <StatCard label="Overdue" value={formatCurrency(k.overdue.amount)} tone={k.overdue.amount > 0 ? "risk" : "ink"} sub={`${k.overdue.installments} installments`} />
            <StatCard
              label="Payments"
              value={k.transactions.payments}
              sub={`${k.transactions.reversals} reversal${k.transactions.reversals === 1 ? "" : "s"}, ${formatDate(k.range.from)} – ${formatDate(k.range.to)}`}
            />
          </StatGroup>

          {/* Charts */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DailyCollectionChart data={s.daily} from={data.filters.from} to={data.filters.to} />
            <MonthlyCollectionChart data={s.monthly} />
            <CollectedVsOutstandingChart title="By class" description="Expected after discounts: collected and still owed" data={s.byClass} />
            <CollectedVsOutstandingChart title="By fee type" description="Expected after discounts: collected and still owed" data={s.byFeeType} />
            <FeeStateBar data={s.obligationStatus} />
            <OverdueTrendChart data={s.overdueTrend} />
          </div>

          {/* Lists */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Most overdue"
                actions={
                  <Link to="/finance/accounts" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
                    All accounts <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                }
              />
              {data.overdueStudents.length === 0 ? (
                <p className="text-sm text-slate-500">No overdue fees.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.overdueStudents.map((r) => (
                    <li key={r.studentId} className="flex items-center gap-3 py-2.5">
                      <Avatar name={r.name} src={r.avatarUrl} size="sm" />
                      <Link to={`/finance/accounts/${r.studentId}`} className="min-w-0 flex-1 hover:text-brand-700">
                        <span className="block truncate text-sm font-medium text-slate-900">{r.name}</span>
                        <span className="block text-xs text-slate-500">{r.class?.name} {r.section?.name} · {r.admissionNumber}</span>
                      </Link>
                      <span className="text-right">
                        <span className="block text-sm font-semibold text-risk tabular-nums">{formatCurrency(r.overdue)}</span>
                        <span className="block text-xs text-slate-500 tabular-nums">of {formatCurrency(r.balance)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader
                title="Latest transactions"
                actions={
                  <Link to="/finance/transactions" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
                    Ledger <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                }
              />
              {data.recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing recorded for this year yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentTransactions.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <Link to={`/finance/receipts/${t.id}`} className="min-w-0 flex-1 hover:text-brand-700">
                        <span className="block truncate text-sm font-medium text-slate-900">{fullName(t.student?.user)}</span>
                        <span className="block font-mono text-xs text-slate-500">{t.receiptNumber} · {formatDate(t.paidOn)} · {methodLabel(t.method)}</span>
                      </Link>
                      {t.type === "REVERSAL" && <Badge tone="danger">Reversal</Badge>}
                      {t.reversedBy && <Badge tone="neutral">Reversed</Badge>}
                      <span className={`text-sm font-semibold tabular-nums ${t.type === "REVERSAL" ? "text-risk" : "text-slate-900"}`}>
                        {t.type === "REVERSAL" ? "−" : ""}
                        {formatCurrency(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default FinanceDashboard;
