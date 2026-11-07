import React, { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, Save } from "lucide-react";
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
    <div className="working-days">
      <label htmlFor="working-days-input" className="working-days-label">
        <CalendarDays size={16} /> Working days for attendance
      </label>
      <input
        id="working-days-input"
        type="number"
        min="1"
        max="366"
        step="1"
        placeholder="e.g. 70"
        value={value}
        className={error ? "input-error" : ""}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={handleSave}
        disabled={saving || !dirty}
      >
        {saving ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save
      </button>
      {justSaved && (
        <span className="working-days-ok">
          <Check size={14} /> Saved
        </span>
      )}
      <div className="working-days-help text-muted">
        Days present are counted
        {attendance.fromBS ? ` from ${attendance.fromBS}` : ""}
        {attendance.toBS ? ` to ${attendance.toBS}` : ""} (BS): the start of the
        academic year to the last day of this exam.
        {saved === null && " Without working days, report cards print only the days present."}
      </div>
      {attendance.cardsOutdated > 0 && (
        <div className="working-days-warning">
          {attendance.cardsOutdated} report card(s) were generated before this
          number was set or changed. Regenerate to update their attendance.
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
};

export default WorkingDaysEditor;
