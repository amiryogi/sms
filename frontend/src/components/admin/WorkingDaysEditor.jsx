import React, { useEffect, useState } from "react";
import { CalendarDays, Check, Save } from "lucide-react";
import { Button, TextInput } from "../ui";
import { examService } from "../../api/examService";

/**
 * Report Cards page: the exam's working days, the "70" in "Attendance 61/70".
 *
 * `attendance` is the `summary.attendance` block of GET /report-cards: the
 * saved number, the BS dates the present days are counted between, and how
 * many generated cards still carry an older number. The backend decides all of
 * that; this only edits the number.
 */
const WorkingDaysEditor = ({ attendance, onSaved }) => {
  const saved = attendance?.workingDays ?? null;
  const [value, setValue] = useState(saved === null ? "" : String(saved));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setValue(saved === null ? "" : String(saved));
    setError("");
  }, [saved, attendance?.examId]);

  if (!attendance) return null;

  const next = value.trim() === "" ? null : Number(value);
  const dirty = next !== saved;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await examService.setWorkingDays(attendance.examId, next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      onSaved?.();
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          "Could not save working days"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="working-days rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="working-days-input" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <CalendarDays size={15} className="text-slate-400" aria-hidden="true" /> Working days for attendance
          </label>
          <TextInput
            id="working-days-input"
            type="number"
            min="1"
            max="366"
            step="1"
            placeholder="e.g. 70"
            value={value}
            invalid={Boolean(error)}
            className="w-32"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button variant="secondary" icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
          Save
        </Button>
        {justSaved && (
          <span className="working-days-ok inline-flex items-center gap-1 pb-2 text-sm font-medium text-emerald-700">
            <Check size={15} aria-hidden="true" /> Saved
          </span>
        )}
      </div>
      <p className="working-days-help mt-2 text-xs text-slate-500">
        Days present are counted
        {attendance.fromBS ? ` from ${attendance.fromBS}` : ""}
        {attendance.toBS ? ` to ${attendance.toBS}` : ""} (BS): the start of the academic year to the last day of this exam.
        {saved === null && " Without working days, report cards print only the days present."}
      </p>
      {attendance.cardsOutdated > 0 && (
        <p className="working-days-warning mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200 ring-inset">
          {attendance.cardsOutdated} report card(s) were generated before this number was set or changed. Regenerate to update their attendance.
        </p>
      )}
      {error && <p className="field-error mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};

export default WorkingDaysEditor;
