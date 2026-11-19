import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Alert, Badge, Button, Dialog, Field, LoadingBlock, SelectInput, Tabs, TextArea, TextInput, toast } from "../ui";
import { calendarService } from "../../api/calendarService";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { todayBs } from "../../lib/calendar/bsDateAdapter";
import { formatAd, weekdayName, toNepaliDigits } from "../../lib/calendar/dateFormatter";
import { categoryMeta } from "../../lib/calendar/calendarConstants";
import { cn } from "../../lib/cn";

/** Lines of "2084-01-01, Name, applies to" -> rows for the server. */
const parsePasted = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [bs = "", title = "", applicability = ""] = line.split(/\s*[,\t|]\s*/);
      return { bs, title, applicability: applicability || undefined };
    });

/**
 * Import a holiday list: choose a published list (or paste one), look at every
 * row with its B.S. date as published and the A.D. date worked out from it,
 * tick what the school observes, then confirm. Nothing is saved before the
 * last step, and a holiday the school already has is never changed.
 */
const HolidayImportDialog = ({ open, onClose, onImported }) => {
  const prefs = useDatePrefs();
  const [sources, setSources] = useState(null);
  const [tab, setTab] = useState("published");
  const [bsYear, setBsYear] = useState("");
  const [pasted, setPasted] = useState({ text: "", source: "", sourceDocument: "", bsYear: String(todayBs()?.year || "") });
  const [preview, setPreview] = useState(null);
  const [request, setRequest] = useState(null); // what the preview was made from
  const [chosen, setChosen] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setRequest(null);
    setTab("published");
    calendarService
      .getHolidaySources()
      .then((res) => {
        const list = res.data?.sources || [];
        setSources(list);
        const current = todayBs()?.year;
        setBsYear(String((list.find((s) => s.bsYear === current) || list[list.length - 1])?.bsYear || ""));
      })
      .catch(() => setSources([]));
  }, [open]);

  const source = sources?.find((s) => String(s.bsYear) === bsYear);

  const runPreview = async () => {
    const body =
      tab === "published"
        ? { bsYear: Number(bsYear) }
        : { bsYear: Number(pasted.bsYear), source: pasted.source, sourceDocument: pasted.sourceDocument, rows: parsePasted(pasted.text) };
    setBusy(true);
    try {
      const res = await calendarService.previewHolidayImport(body);
      setPreview(res.data);
      setRequest(body);
      setChosen(new Set(res.data.rows.filter((r) => !r.error && !r.duplicate && r.recommended).map((r) => r.key)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not read the list");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await calendarService.importHolidays({ ...request, keys: [...chosen], confirm: true });
      const { created, skipped } = res.data;
      toast.success(`${created} holiday${created === 1 ? "" : "s"} added${skipped.length ? `, ${skipped.length} skipped` : ""}`);
      onImported?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not import");
    } finally {
      setBusy(false);
    }
  };

  const selectable = useMemo(() => (preview?.rows || []).filter((r) => !r.error && !r.duplicate), [preview]);
  const toggle = (key) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Import holidays"
      description={preview ? "Check each date, tick the holidays your school observes, then confirm." : "Choose a published list, or paste your own."}
      footer={
        preview ? (
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>Back</Button>
            <Button onClick={runImport} loading={busy} disabled={chosen.size === 0}>
              Add {chosen.size} holiday{chosen.size === 1 ? "" : "s"} to the calendar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={runPreview} loading={busy} disabled={tab === "published" ? !bsYear : !pasted.text.trim() || !pasted.source.trim() || !pasted.bsYear}>
              Preview
            </Button>
          </>
        )
      }
    >
      {!sources ? (
        <LoadingBlock text="Loading lists…" />
      ) : !preview ? (
        <div className="space-y-4">
          <Tabs
            tabs={[
              { value: "published", label: "Government list" },
              { value: "paste", label: "Paste a list" },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "published" ? (
            sources.length === 0 ? (
              <Alert tone="info">No published list is built in yet. Paste the list instead.</Alert>
            ) : (
              <>
                <Field label="B.S. year" htmlFor="imp-year">
                  <SelectInput id="imp-year" value={bsYear} onChange={(e) => setBsYear(e.target.value)} className="sm:w-48">
                    {sources.map((s) => (
                      <option key={s.bsYear} value={s.bsYear}>{s.bsYear} ({toNepaliDigits(s.bsYear)})</option>
                    ))}
                  </SelectInput>
                </Field>
                {source && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
                    <p className="font-medium text-slate-900">{source.source}</p>
                    <p className="text-slate-600">{source.sourceDocument}</p>
                    <p className="mt-1 text-slate-600">{source.count} dated holidays.</p>
                    {source.sourceUrl && (
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                        Open the official page <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
                <Alert tone="info" title="The list is a starting point">
                  The government list is for offices. Holidays for one community, region or group are shown but not ticked: tick the ones your school observes, and add your own school holidays afterwards.
                </Alert>
              </>
            )
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="B.S. year" htmlFor="imp-pyear" required>
                  <TextInput id="imp-pyear" inputMode="numeric" value={pasted.bsYear} onChange={(e) => setPasted({ ...pasted, bsYear: e.target.value })} />
                </Field>
                <Field label="Source" htmlFor="imp-source" required className="sm:col-span-2" hint="Who published it, e.g. Kathmandu Metropolitan City">
                  <TextInput id="imp-source" value={pasted.source} maxLength={255} onChange={(e) => setPasted({ ...pasted, source: e.target.value })} />
                </Field>
              </div>
              <Field label="Document" htmlFor="imp-doc" hint="Title or link of the notice (optional)">
                <TextInput id="imp-doc" value={pasted.sourceDocument} maxLength={500} onChange={(e) => setPasted({ ...pasted, sourceDocument: e.target.value })} />
              </Field>
              <Field label="Holidays" htmlFor="imp-text" required hint="One per line: B.S. date, name, who it applies to (optional). Example: 2084-01-01, Nepali New Year">
                <TextArea id="imp-text" rows={8} className="font-mono text-xs" value={pasted.text} onChange={(e) => setPasted({ ...pasted, text: e.target.value })} placeholder={"2084-01-01, Nepali New Year\n2084-02-15, Republic Day"} />
              </Field>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-900">{preview.source}</span>
            <span className="text-slate-500">{preview.bsYear} B.S.</span>
            <span className="flex-1" />
            {/* Counts are neutral; only rows that cannot be read are a problem. */}
            <Badge tone="neutral">{preview.summary.new} new</Badge>
            {preview.summary.duplicates > 0 && <Badge tone="neutral">{preview.summary.duplicates} already on the calendar</Badge>}
            {preview.summary.invalid > 0 && <Badge tone="danger">{preview.summary.invalid} cannot be read</Badge>}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => setChosen(new Set(selectable.map((r) => r.key)))}>Tick all</Button>
            <Button variant="ghost" size="sm" onClick={() => setChosen(new Set(selectable.filter((r) => r.recommended).map((r) => r.key)))}>Nationwide only</Button>
            <Button variant="ghost" size="sm" onClick={() => setChosen(new Set())}>Tick none</Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Import</span></th>
                  <th scope="col" className="px-3 py-2 font-medium">Holiday</th>
                  <th scope="col" className="px-3 py-2 font-medium">Published (B.S.)</th>
                  <th scope="col" className="px-3 py-2 font-medium">A.D. date</th>
                  <th scope="col" className="px-3 py-2 font-medium">Applies to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {preview.rows.map((row) => {
                  const blocked = Boolean(row.error || row.duplicate);
                  return (
                    <tr key={row.key} className={cn(blocked && "bg-slate-50 text-slate-500")} data-testid="import-row">
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
                          aria-label={`Import ${row.title}`}
                          checked={chosen.has(row.key)}
                          disabled={blocked}
                          onChange={() => toggle(row.key)}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="font-medium text-slate-900">{row.title || "(no name)"}</span>
                        {row.titleNe && <span className="block text-xs text-slate-500">{row.titleNe}</span>}
                        <span className="mt-0.5 block text-xs text-slate-500">{categoryMeta(row.category).label}</span>
                        {row.error && <span className="mt-0.5 block text-xs font-medium text-risk">{row.error}</span>}
                        {/* Already on the calendar is not a problem, just the reason the box is off. */}
                        {row.duplicate && <span className="mt-0.5 block text-xs font-medium text-slate-600">{row.duplicate.reason}</span>}
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap tabular-nums">
                        {row.bsStart || "—"}
                        {row.bsEnd && row.bsEnd !== row.bsStart ? ` to ${row.bsEnd}` : ""}
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        {row.startDate ? (
                          <>
                            {formatAd(row.startDate)}
                            {row.endDate !== row.startDate ? ` to ${formatAd(row.endDate)}` : ""}
                            <span className="block text-xs text-slate-500">{weekdayName(row.weekday, prefs.language)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">{row.applicability || "Everyone"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.undated?.length > 0 && (
            <Alert tone="warning" title="Holidays the notice does not date">
              <p>These are announced nearer the time. Add them by hand once the date is known:</p>
              <ul className="mt-1 list-inside list-disc">
                {preview.undated.map((u) => (
                  <li key={u.title}>
                    {u.title}
                    {u.applicability ? ` (${u.applicability})` : ""}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default HolidayImportDialog;
