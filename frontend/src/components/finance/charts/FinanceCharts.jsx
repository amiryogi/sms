import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, ReferenceLine } from "recharts";
import { CheckCircle2, Clock, AlertTriangle, CircleDashed } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/format";
import ChartCard, { LegendItem } from "./ChartCard";
import { SERIES, STATUS_COLORS, AXIS, compactRs, niceMax, shortBsMonth, clip } from "./chartTheme";

/**
 * The finance dashboard's charts. Every value comes from GET /fees/dashboard;
 * nothing is computed here except layout. Marks follow the dataviz rules:
 * thin bars with 4px rounded data ends, a 2px white gap between stacked
 * segments, a recessive grid, one y-axis, hover tooltips, and a table view.
 */

const Tip = ({ active, payload, label, formatLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-slate-900">{formatLabel ? formatLabel(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-sm" style={{ backgroundColor: p.color || p.fill }} aria-hidden="true" />
          {p.name}: <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const axisProps = { tick: AXIS.tick, axisLine: { stroke: AXIS.line }, tickLine: false };
const yAxisProps = { tick: AXIS.tick, axisLine: false, tickLine: false, tickFormatter: compactRs, width: 48, tickCount: 5, allowDecimals: false };
// Tidy ticks: zero (or the lowest value, if negative) up to a round maximum.
const niceDomain = [(min) => Math.min(0, min), (max) => niceMax(max)];

/** Net collection per day (reversals pull a day below zero). */
export const DailyCollectionChart = ({ data, from, to }) => {
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <ChartCard
      title="Daily collection"
      description={`${formatDate(from)} – ${formatDate(to)} · ${formatCurrency(total)} net`}
      columns={["Date", "Net collected"]}
      table={data.filter((d) => d.amount !== 0).map((d) => ({ label: formatDate(d.date), values: [formatCurrency(d.amount)] }))}
      empty={data.every((d) => d.amount === 0)}
      emptyText="No payments in this period"
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={AXIS.grid} />
            <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...axisProps} />
            <YAxis {...yAxisProps} domain={niceDomain} />
            <ReferenceLine y={0} stroke={AXIS.line} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={<Tip formatLabel={(d) => formatDate(d)} />} />
            <Bar dataKey="amount" name="Net collected" fill={SERIES.collected} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

/** Net collection per BS month of the academic year. */
export const MonthlyCollectionChart = ({ data }) => (
  <ChartCard
    title="Monthly collection"
    description="By Nepali month, net of reversals"
    columns={["Month", "Net collected"]}
    table={data.map((m) => ({ label: m.label, values: [formatCurrency(m.amount)] }))}
    empty={data.every((m) => m.amount === 0)}
  >
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={AXIS.grid} />
          <XAxis dataKey="label" tickFormatter={shortBsMonth} interval="preserveStartEnd" minTickGap={14} {...axisProps} />
          <YAxis {...yAxisProps} domain={niceDomain} />
          <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={<Tip />} />
          <Bar dataKey="amount" name="Net collected" fill={SERIES.collected} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </ChartCard>
);

/**
 * Collected vs still owed, stacked to the expected amount (after discounts),
 * one bar per class or fee type.
 */
export const CollectedVsOutstandingChart = ({ title, description, data }) => {
  const height = Math.max(160, data.length * 34 + 30);
  return (
    <ChartCard
      title={title}
      description={description}
      legend={
        <>
          <LegendItem color={SERIES.collected}>Collected</LegendItem>
          <LegendItem color={SERIES.outstanding}>Still owed</LegendItem>
        </>
      }
      columns={["", "Expected", "Collected", "Still owed"]}
      table={data.map((r) => ({ label: r.label, values: [formatCurrency(r.expected), formatCurrency(r.collected), formatCurrency(r.outstanding)] }))}
      empty={data.length === 0}
      emptyText="No fees generated for this year"
    >
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={AXIS.grid} />
            <XAxis type="number" tickFormatter={compactRs} domain={[0, (max) => niceMax(max)]} tickCount={5} allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="label" width={100} tick={AXIS.tick} tickFormatter={(l) => clip(l)} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={<Tip />} />
            <Bar dataKey="collected" name="Collected" stackId="a" fill={SERIES.collected} stroke="#fff" strokeWidth={2} maxBarSize={18} />
            <Bar dataKey="outstanding" name="Still owed" stackId="a" fill={SERIES.outstanding} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

const STATES = [
  { key: "paid", label: "Paid", icon: CheckCircle2 },
  { key: "partial", label: "Partly paid", icon: Clock },
  { key: "pending", label: "Not yet due", icon: CircleDashed },
  { key: "overdue", label: "Overdue", icon: AlertTriangle },
];

/** Fees by state: one segmented bar plus a labelled legend with counts. */
export const FeeStateBar = ({ data }) => {
  const total = STATES.reduce((s, st) => s + (data[st.key]?.count || 0), 0);
  return (
    <ChartCard
      title="Fees by state"
      description={`${total} fees this year`}
      columns={["State", "Fees", "Still owed"]}
      table={STATES.map((s) => ({ label: s.label, values: [data[s.key]?.count || 0, formatCurrency(data[s.key]?.amount || 0)] }))}
      empty={total === 0}
      emptyText="No fees generated for this year"
    >
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label={STATES.map((s) => `${s.label} ${data[s.key]?.count || 0}`).join(", ")}>
        {STATES.filter((s) => data[s.key]?.count).map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${data[s.key].count}`}
            className="h-full first:rounded-l-md last:rounded-r-md"
            style={{ width: `${(data[s.key].count / total) * 100}%`, backgroundColor: STATUS_COLORS[s.key] }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {STATES.map((s) => (
          <li key={s.key} className="flex items-start gap-2">
            <s.icon size={16} className="mt-0.5 shrink-0" style={{ color: STATUS_COLORS[s.key] }} aria-hidden="true" />
            <div>
              <p className="text-sm text-slate-600">{s.label}</p>
              <p className="text-lg leading-tight font-semibold text-slate-900 tabular-nums">{data[s.key]?.count || 0}</p>
              {s.key !== "paid" && (data[s.key]?.amount || 0) > 0 && <p className="text-xs text-slate-500 tabular-nums">{formatCurrency(data[s.key].amount)} owed</p>}
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
};

/** Overdue balance at the end of each month. */
export const OverdueTrendChart = ({ data }) => (
  <ChartCard
    title="Overdue balance"
    description="Unpaid on installments already due, at each month end"
    columns={["Month", "Overdue"]}
    table={data.map((m) => ({ label: m.label, values: [formatCurrency(m.amount)] }))}
    empty={data.length === 0 || data.every((m) => m.amount === 0)}
    emptyText="Nothing has been overdue"
  >
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={AXIS.grid} />
          <XAxis dataKey="label" tickFormatter={shortBsMonth} minTickGap={12} {...axisProps} />
          <YAxis {...yAxisProps} domain={niceDomain} />
          <Tooltip cursor={{ stroke: AXIS.line }} content={<Tip />} />
          <Area type="monotone" dataKey="amount" name="Overdue" stroke={SERIES.outstanding} strokeWidth={2} fill={SERIES.outstanding} fillOpacity={0.12} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </ChartCard>
);
