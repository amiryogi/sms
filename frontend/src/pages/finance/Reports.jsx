import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSpreadsheet, Printer, Download, TrendingUp, AlertTriangle, BadgePercent, Undo2, RotateCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { PageHeader, PageShell, Tabs, Card, Button, Field, SelectInput, NepaliDatePicker, Switch, EmptyState, LoadingBlock, Spinner, toast } from "../../components/ui";
import { PAYMENT_METHODS, methodLabel } from "../../components/finance/financeLabels";
import { cn } from "../../lib/cn";
import { formatCurrency, formatDate, formatDateTime, todayAd } from "../../utils/format";
import { adToBs, bsToAd } from "../../lib/calendar/bsDateAdapter";

const REPORTS = [
  { value: "collections", label: "Collections", icon: TrendingUp },
  { value: "outstanding", label: "Outstanding", icon: AlertTriangle },
  { value: "discounts", label: "Discounts", icon: BadgePercent },
  { value: "reversals", label: "Reversals", icon: Undo2 },
];

const localToday = todayAd;
// Reports open on the current Nepali month, and reversals on the Nepali year so far.
const bsToday = () => adToBs(localToday());
const monthStart = () => bsToAd({ ...bsToday(), day: 1 });
const yearStart = () => bsToAd({ year: bsToday().year, month: 1, day: 1 });

const DEFAULTS = {
  collections: { from: monthStart(), to: localToday(), groupBy: "day", classId: "", feeTypeId: "", method: "", academicYearId: "" },
  outstanding: { academicYearId: "", classId: "", overdueOnly: "false" },
  discounts: { academicYearId: "", status: "" },
  reversals: { from: yearStart(), to: localToday() },
};

const cellValue = (col, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (col.type === "money") return formatCurrency(value);
  if (col.type === "date") return formatDate(value);
  return String(value);
};
const numeric = (col) => col.type === "money" || col.type === "number";

/**
 * Financial reports: collections (grouped by day, month, class, fee type or
 * method), outstanding balances, discounts and reversals. Each can be printed
 * or downloaded as CSV; the CSV comes from the same server-side rows.
 */
const Reports = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const name = REPORTS.some((r) => r.value === searchParams.get("report")) ? searchParams.get("report") : "collections";
  const [params, setParams] = useState(DEFAULTS);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), academicService.getClasses(), feeService.getFeeTypes()])
      .then(([y, c, t]) => {
        setYears(y.data || []);
        setClasses(c.data || []);
        setFeeTypes(t.data || []);
      })
      .catch(() => toast.error("Could not load filter options"));
  }, []);

  const current = params[name];
  const query = Object.fromEntries(Object.entries(current).filter(([, v]) => v !== "" && v !== null));
  const key = JSON.stringify([name, query]);
  const loading = loadedKey !== key;

  const load = useCallback(
    () =>
      feeService
        .getReport(name, JSON.parse(key)[1])
        .then((res) => {
          setResult(res.data);
          setError("");
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load the report"))
        .finally(() => setLoadedKey(key)),
    [name, key],
  );

  useEffect(() => {
    load();
  }, [load]);

  const set = (field, value) => setParams((p) => ({ ...p, [name]: { ...p[name], [field]: value } }));

  const download = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await feeService.downloadReport(name, query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the CSV");
    } finally {
      setDownloading(false);
    }
  };

  const yearSelect = (allowAll) => (
    <Field label="Academic year" htmlFor="r-year">
      <SelectInput id="r-year" value={current.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}>
        <option value="">{allowAll ? "All years" : "Current year"}</option>
        {years.map((y) => (
          <option key={y.id} value={y.id}>{y.name}</option>
        ))}
      </SelectInput>
    </Field>
  );
  const dateRange = (
    <>
      <Field label="From" htmlFor="r-from">
        <NepaliDatePicker id="r-from" value={current.from} max={current.to || undefined} onChange={(ad) => set("from", ad)} />
      </Field>
      <Field label="To" htmlFor="r-to">
        <NepaliDatePicker id="r-to" value={current.to} min={current.from || undefined} max={localToday()} onChange={(ad) => set("to", ad)} />
      </Field>
    </>
  );
  const classSelect = (
    <Field label="Class" htmlFor="r-class">
      <SelectInput id="r-class" value={current.classId} onChange={(e) => set("classId", e.target.value)}>
        <option value="">All classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </SelectInput>
    </Field>
  );

  return (
    <PageShell>
      <PageHeader title="Financial reports" description="Print them or download a spreadsheet. Every figure comes from the fee ledger." className="print:hidden" />

      <Tabs className="print:hidden" value={name} onChange={(v) => setSearchParams(v === "collections" ? {} : { report: v })} tabs={REPORTS} />

      <Card className="print:hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {name === "collections" && (
            <>
              {dateRange}
              <Field label="Group by" htmlFor="r-group">
                <SelectInput id="r-group" value={current.groupBy} onChange={(e) => set("groupBy", e.target.value)}>
                  <option value="day">Day</option>
                  <option value="month">Month (BS)</option>
                  <option value="class">Class</option>
                  <option value="feeType">Fee type</option>
                  <option value="method">Payment method</option>
                </SelectInput>
              </Field>
              {yearSelect(true)}
              {classSelect}
              <Field label="Fee type" htmlFor="r-feetype">
                <SelectInput id="r-feetype" value={current.feeTypeId} onChange={(e) => set("feeTypeId", e.target.value)}>
                  <option value="">All fee types</option>
                  {feeTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Method" htmlFor="r-method">
                <SelectInput id="r-method" value={current.method} onChange={(e) => set("method", e.target.value)}>
                  <option value="">Any method</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{methodLabel(m.value)}</option>
                  ))}
                </SelectInput>
              </Field>
            </>
          )}
          {name === "outstanding" && (
            <>
              {yearSelect(false)}
              {classSelect}
              <div className="flex items-end pb-2">
                <Switch id="r-overdue" label="Overdue only" checked={current.overdueOnly === "true"} onChange={(checked) => set("overdueOnly", checked ? "true" : "false")} />
              </div>
            </>
          )}
          {name === "discounts" && (
            <>
              {yearSelect(true)}
              <Field label="Status" htmlFor="r-status">
                <SelectInput id="r-status" value={current.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="">Any status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Waiting for approval</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REVOKED">Revoked</option>
                </SelectInput>
              </Field>
            </>
          )}
          {name === "reversals" && dateRange}
        </div>
      </Card>

      {error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Report unavailable" description={error} action={<Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>} />
        </Card>
      ) : !result || result.report !== name ? (
        <Card><LoadingBlock text="Building report…" /></Card>
      ) : (
        <Card padding="none" className="overflow-hidden print:border-0 print:shadow-none" aria-busy={loading}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <p className="hidden text-sm font-semibold text-slate-900 print:block">{user?.school?.name}</p>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                {result.title}
                {loading && (
                  <span role="status" className="inline-flex items-center gap-1.5 text-xs font-normal text-slate-500 print:hidden">
                    <Spinner size={14} /> Updating
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500">{result.subtitle}</p>
              <p className="hidden text-xs text-slate-500 print:block">Printed {formatDateTime(new Date())}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="secondary" icon={Printer} onClick={() => window.print()} disabled={!result.rows.length}>Print</Button>
              <Button variant="secondary" icon={Download} loading={downloading} onClick={download} disabled={!result.rows.length} data-guide="reports.export">Download CSV</Button>
            </div>
          </div>
          {result.rows.length === 0 ? (
            <EmptyState compact icon={FileSpreadsheet} title="Nothing to report" description="No records match these filters." />
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-160 text-sm print:min-w-0 print:text-xs">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 print:bg-white">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c.key} scope="col" className={cn("border-b border-slate-200 px-4 py-2.5 font-medium whitespace-nowrap", numeric(c) && "text-right")}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.rows.map((row, idx) => (
                    <tr key={row.key ?? row.studentId ?? row.receiptNumber ?? idx} className="break-inside-avoid">
                      {result.columns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-2.5", numeric(c) && "text-right tabular-nums whitespace-nowrap", c.key === "reason" && "max-w-xs")}>
                          {cellValue(c, row[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {result.totals && (
                  <tfoot>
                    <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-900 print:bg-white">
                      {result.columns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-2.5", numeric(c) && "text-right tabular-nums whitespace-nowrap")}>
                          {result.totals[c.key] === undefined ? "" : typeof result.totals[c.key] === "string" ? result.totals[c.key] : cellValue(c, result.totals[c.key])}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
};

export default Reports;
