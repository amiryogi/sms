import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  LayoutTemplate,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { reportCardLayoutService } from "../../api/reportCardLayoutService";
import NepalReportCard from "../common/NepalReportCard";

/**
 * School Settings -> Report Card Layout.
 *
 * The backend owns the layout: it supplies the presets, which settings each
 * template uses (`templateFields`), a sample report card graded on the
 * school's own scale, and per-field validation errors. This component only
 * edits a draft and previews it with the real report-card component.
 */

const SELECTS = {
  mode: {
    label: "Show",
    options: [
      ["grades", "Grades only"],
      ["marks", "Marks only"],
      ["both", "Marks and grades"],
    ],
  },
  theoryPracticalSplit: {
    label: "Theory / practical columns",
    options: [
      ["auto", "When the exam has practicals"],
      ["always", "Always"],
      ["never", "Never (one grade per subject)"],
    ],
  },
  remarkColumn: {
    label: "Remark column",
    options: [
      ["description", "Grade description"],
      ["blank", "Empty (written by hand)"],
      ["hidden", "No remark column"],
    ],
  },
  classNameStyle: {
    label: "Class printed as",
    options: [
      ["name", "Class name (Grade 9)"],
      ["wordAndNumeral", "Word and number (Nine [9])"],
    ],
  },
  studentCodeField: {
    label: "Code after the student's name",
    options: [
      ["admissionNumber", "Admission number"],
      ["none", "None"],
    ],
  },
};

const CHECKBOXES = [
  [
    "showAttendance",
    "Attendance",
    "Days present / working days. Set working days per exam on the Report Cards page.",
  ],
  ["countLateAsPresent", "Late counts as present"],
  ["showPercentage", "Percentage"],
  ["showRank", "Class rank"],
  ["showResult", "Pass / fail result"],
  ["showSummaryGrid", "Summary (subjects passed and failed)"],
  ["showGradeLegend", "Grade scale table"],
  ["showTeacherRemarks", "Teacher and principal remarks"],
  ["showSubjectCode", "Subject code column"],
  ["showCreditHours", "Credit hour column"],
  ["showPrincipalName", "Principal's name above the last signature"],
  ["showSeal", "Space for the school seal"],
  ["showWatermark", "School logo as a faint watermark"],
];

const MAX_SIGNATURES = 4;

const ReportCardLayoutSettings = () => {
  const [state, setState] = useState(null); // { config, isCustom, presets, templateFields, sample }
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  const apply = (data) => {
    setState(data);
    setDraft(data.config);
    setErrors({});
  };

  useEffect(() => {
    reportCardLayoutService
      .get()
      .then((res) => apply(res.data.data))
      .catch((error) =>
        setMessage({
          type: "error",
          text: error.response?.data?.message || "Could not load the report card layout",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const flash = (type, text) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const dirty = useMemo(
    () => Boolean(state && draft && JSON.stringify(state.config) !== JSON.stringify(draft)),
    [state, draft]
  );

  const preview = useMemo(
    () => (state && draft ? { ...state.sample, layout: draft } : null),
    [state, draft]
  );

  if (loading) {
    return (
      <div className="card grade-scales rc-layout">
        <h3 className="card-title">
          <LayoutTemplate size={20} /> Report Card Layout
        </h3>
        <div className="grade-scales-loading">
          <Loader2 className="spinner" size={20} /> Loading layout...
        </div>
      </div>
    );
  }

  if (!state || !draft) {
    return (
      <div className="card grade-scales rc-layout">
        <h3 className="card-title">
          <LayoutTemplate size={20} /> Report Card Layout
        </h3>
        <div className="grade-scales-message is-error">
          <X size={16} /> <span>{message.text || "Could not load the report card layout"}</span>
        </div>
      </div>
    );
  }

  const fields = state.templateFields[draft.template] || [];
  const uses = (key) => fields.includes(key);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const presetName = (template) =>
    state.presets.find((p) => p.config.template === template)?.name || template;

  const applyPreset = (preset) => {
    setDraft(preset.config);
    setErrors({});
  };

  const changeTemplate = (template) => {
    const preset = state.presets.find((p) => p.config.template === template);
    if (preset) applyPreset(preset);
  };

  const setSignature = (i, value) =>
    set(
      "signatures",
      draft.signatures.map((s, j) => (j === i ? value : s))
    );

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await reportCardLayoutService.save(draft);
      apply(res.data.data);
      flash("success", "Report card layout saved. It applies to every report card from now on.");
    } catch (error) {
      const list = error.response?.data?.errors;
      if (Array.isArray(list) && list.length) {
        const map = {};
        list.forEach((e) => {
          if (e.field && !map[e.field]) map[e.field] = e.message;
        });
        setErrors(map);
        flash("error", `Please fix ${list.length} problem(s) below.`);
      } else {
        flash("error", error.response?.data?.message || "Could not save the layout");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = window.confirm(
      "Go back to the original NEB grade sheet?\n\nYour saved layout settings will be removed."
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await reportCardLayoutService.reset();
      apply(res.data.data);
      flash("success", "Report cards are back to the original NEB grade sheet.");
    } catch (error) {
      flash("error", error.response?.data?.message || "Could not reset the layout");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key) =>
    errors[key] ? <span className="field-error">{errors[key]}</span> : null;

  return (
    <div className="card grade-scales rc-layout">
      <h3 className="card-title">
        <LayoutTemplate size={20} /> Report Card Layout
      </h3>
      <p className="text-muted grade-scales-intro">
        What the printed report card shows. This changes how grades are printed,
        never the grades themselves, and applies to every report card at once,
        including ones already generated.
      </p>

      {message.text && (
        <div className={`grade-scales-message is-${message.type}`}>
          {message.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="rc-layout-status">
        {state.isCustom ? (
          <>
            In use: <strong>{presetName(state.config.template)}</strong> with your settings.
          </>
        ) : (
          <>
            In use: <strong>the original NEB grade sheet</strong> (never changed).
          </>
        )}
      </div>

      <div className="grade-scales-new">
        <span className="text-muted">Start from:</span>
        {state.presets.map((p) => (
          <button
            key={p.key}
            type="button"
            className="btn btn-secondary btn-small"
            title={p.description}
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="rc-layout-body">
        <div className="rc-layout-form">
          <div className="form-group">
            <label htmlFor="rcl-template">Template</label>
            <select
              id="rcl-template"
              value={draft.template}
              onChange={(e) => changeTemplate(e.target.value)}
            >
              {state.presets.map((p) => (
                <option key={p.key} value={p.config.template}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldError("template")}
            <small className="text-muted">
              {state.presets.find((p) => p.config.template === draft.template)?.description}
            </small>
          </div>

          {uses("title") && (
            <div className="form-group">
              <label htmlFor="rcl-title">Title</label>
              <input
                id="rcl-title"
                value={draft.title}
                maxLength={80}
                className={errors.title ? "input-error" : ""}
                onChange={(e) => set("title", e.target.value)}
              />
              {fieldError("title")}
            </div>
          )}

          <div className="rc-layout-grid">
            {Object.entries(SELECTS)
              .filter(([key]) => uses(key))
              .map(([key, { label, options }]) => (
                <div className="form-group" key={key}>
                  <label htmlFor={`rcl-${key}`}>{label}</label>
                  <select
                    id={`rcl-${key}`}
                    value={draft[key]}
                    onChange={(e) => set(key, e.target.value)}
                  >
                    {options.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                  {fieldError(key)}
                </div>
              ))}

            {uses("minTableRows") && (
              <div className="form-group">
                <label htmlFor="rcl-rows">Minimum table rows</label>
                <input
                  id="rcl-rows"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={draft.minTableRows}
                  className={errors.minTableRows ? "input-error" : ""}
                  onChange={(e) =>
                    set("minTableRows", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                />
                {fieldError("minTableRows")}
                <small className="text-muted">Pads the table with empty space.</small>
              </div>
            )}
          </div>

          <fieldset className="rc-layout-checks">
            <legend>Print</legend>
            {CHECKBOXES.filter(([key]) => uses(key)).map(([key, label, hint]) => (
              <label key={key} className="rc-layout-check" title={hint || ""}>
                <input
                  type="checkbox"
                  checked={Boolean(draft[key])}
                  onChange={(e) => set(key, e.target.checked)}
                />
                <span>
                  {label}
                  {hint && <small className="text-muted"> — {hint}</small>}
                </span>
                {fieldError(key)}
              </label>
            ))}
          </fieldset>

          {uses("signatures") && (
            <div className="form-group">
              <label>Signatures</label>
              {fieldError("signatures")}
              <div className="rc-layout-signatures">
                {draft.signatures.map((label, i) => (
                  <div key={i} className="rc-layout-signature">
                    <input
                      value={label}
                      maxLength={40}
                      aria-label={`Signature ${i + 1}`}
                      className={errors[`signatures[${i}]`] ? "input-error" : ""}
                      onChange={(e) => setSignature(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      aria-label={`Remove signature ${i + 1}`}
                      onClick={() =>
                        set(
                          "signatures",
                          draft.signatures.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                    {fieldError(`signatures[${i}]`)}
                  </div>
                ))}
              </div>
              {draft.signatures.length < MAX_SIGNATURES && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => set("signatures", [...draft.signatures, ""])}
                >
                  <Plus size={14} /> Add signature
                </button>
              )}
            </div>
          )}

          {uses("footerText") && (
            <div className="form-group">
              <label htmlFor="rcl-footer">Footer note</label>
              <textarea
                id="rcl-footer"
                rows={3}
                maxLength={600}
                value={draft.footerText}
                className={errors.footerText ? "input-error" : ""}
                onChange={(e) => set("footerText", e.target.value)}
              />
              {fieldError("footerText")}
              <small className="text-muted">
                Leave empty to print the school&apos;s phone and email instead.
              </small>
            </div>
          )}

          <div className="grade-scale-editor-actions">
            {state.isCustom && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw size={16} /> Back to original
              </button>
            )}
            <span className="grade-scale-spacer" />
            {dirty && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => apply(state)}
                disabled={saving}
              >
                Discard changes
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? <Loader2 className="spinner" size={16} /> : <Save size={16} />}
              Save layout
            </button>
          </div>
        </div>

        <div className="rc-layout-preview-wrap">
          <div className="rc-layout-preview-label text-muted">
            Preview — sample student, graded on your default grade scale
          </div>
          <div className="rc-layout-preview">
            <NepalReportCard data={preview} showActions={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCardLayoutSettings;
