import React, { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { reportCardLayoutService } from "../../api/reportCardLayoutService";
import NepalReportCard from "../common/NepalReportCard";
import { Alert, Button, Card, CardHeader, Field, IconButton, LoadingBlock, SelectInput, TextArea, TextInput, toast, confirmDialog } from "../ui";

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
  ["showAttendance", "Attendance", "Days present / working days. Set working days per exam on the Report Cards page."],
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

const Shell = ({ children }) => (
  <Card className="rc-layout">
    <CardHeader
      icon={LayoutTemplate}
      title="Report card layout"
      description="What the printed report card shows. This changes how grades are printed, never the grades themselves, and applies to every report card at once, including ones already generated."
    />
    {children}
  </Card>
);

const ReportCardLayoutSettings = () => {
  const [state, setState] = useState(null); // { config, isCustom, presets, templateFields, sample }
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState("");

  const apply = (data) => {
    setState(data);
    setDraft(data.config);
    setErrors({});
    setProblem("");
  };

  useEffect(() => {
    reportCardLayoutService
      .get()
      .then((res) => apply(res.data.data))
      .catch((error) => setProblem(error.response?.data?.message || "Could not load the report card layout"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => Boolean(state && draft && JSON.stringify(state.config) !== JSON.stringify(draft)), [state, draft]);
  const preview = useMemo(() => (state && draft ? { ...state.sample, layout: draft } : null), [state, draft]);

  if (loading) {
    return (
      <Shell>
        <LoadingBlock text="Loading layout…" />
      </Shell>
    );
  }

  if (!state || !draft) {
    return (
      <Shell>
        <Alert tone="danger" className="rc-layout-message">{problem || "Could not load the report card layout"}</Alert>
      </Shell>
    );
  }

  const fields = state.templateFields[draft.template] || [];
  const uses = (key) => fields.includes(key);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const presetName = (template) => state.presets.find((p) => p.config.template === template)?.name || template;

  const applyPreset = (preset) => {
    setDraft(preset.config);
    setErrors({});
    setProblem("");
  };

  const changeTemplate = (template) => {
    const preset = state.presets.find((p) => p.config.template === template);
    if (preset) applyPreset(preset);
  };

  const setSignature = (i, value) => set("signatures", draft.signatures.map((s, j) => (j === i ? value : s)));

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    setProblem("");
    try {
      const res = await reportCardLayoutService.save(draft);
      apply(res.data.data);
      toast.success("Report card layout saved. It applies to every report card from now on.");
    } catch (error) {
      const list = error.response?.data?.errors;
      if (Array.isArray(list) && list.length) {
        const map = {};
        list.forEach((e) => {
          if (e.field && !map[e.field]) map[e.field] = e.message;
        });
        setErrors(map);
        setProblem(`Please fix ${list.length} problem(s) below.`);
      } else {
        toast.error(error.response?.data?.message || "Could not save the layout");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirmDialog({
      title: "Go back to the original NEB grade sheet?",
      message: "Your saved layout settings will be removed.",
      confirmLabel: "Back to original",
      tone: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await reportCardLayoutService.reset();
      apply(res.data.data);
      toast.success("Report cards are back to the original NEB grade sheet");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset the layout");
    } finally {
      setSaving(false);
    }
  };

  const err = (key) => errors[key];
  const errorText = (key) => (errors[key] ? <p className="field-error mt-1 text-xs font-medium text-red-600">{errors[key]}</p> : null);
  const currentPreset = state.presets.find((p) => p.config.template === draft.template);

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <p className="rc-layout-status text-sm text-slate-600">
          In use:{" "}
          {state.isCustom ? (
            <>
              <strong className="text-slate-900">{presetName(state.config.template)}</strong> with your settings.
            </>
          ) : (
            <>
              <strong className="text-slate-900">the original NEB grade sheet</strong> (never changed).
            </>
          )}
        </p>
        <div className="rc-layout-presets flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Start from:</span>
          {state.presets.map((p) => (
            <Button key={p.key} size="sm" variant="secondary" title={p.description} onClick={() => applyPreset(p)}>
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {problem && <Alert tone="danger" className="rc-layout-message mt-4">{problem}</Alert>}

      <div className="rc-layout-body mt-5 grid items-start gap-6 xl:grid-cols-[minmax(320px,1fr)_auto]">
        <div className="rc-layout-form space-y-5">
          <Field label="Template" htmlFor="rcl-template" error={err("template")} hint={currentPreset?.description}>
            <SelectInput id="rcl-template" value={draft.template} onChange={(e) => changeTemplate(e.target.value)}>
              {state.presets.map((p) => (
                <option key={p.key} value={p.config.template}>{p.name}</option>
              ))}
            </SelectInput>
          </Field>

          {uses("title") && (
            <Field label="Title" htmlFor="rcl-title" error={err("title")}>
              <TextInput id="rcl-title" value={draft.title} maxLength={80} invalid={Boolean(err("title"))} onChange={(e) => set("title", e.target.value)} />
            </Field>
          )}

          <div className="grid gap-4 empty:hidden sm:grid-cols-2">
            {Object.entries(SELECTS)
              .filter(([key]) => uses(key))
              .map(([key, { label, options }]) => (
                <Field key={key} label={label} htmlFor={`rcl-${key}`} error={err(key)}>
                  <SelectInput id={`rcl-${key}`} value={draft[key]} onChange={(e) => set(key, e.target.value)}>
                    {options.map(([value, text]) => (
                      <option key={value} value={value}>{text}</option>
                    ))}
                  </SelectInput>
                </Field>
              ))}

            {uses("minTableRows") && (
              <Field label="Minimum table rows" htmlFor="rcl-rows" error={err("minTableRows")} hint="Pads the table with empty space.">
                <TextInput
                  id="rcl-rows"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={draft.minTableRows}
                  invalid={Boolean(err("minTableRows"))}
                  onChange={(e) => set("minTableRows", e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </Field>
            )}
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-900">Print</legend>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {CHECKBOXES.filter(([key]) => uses(key)).map(([key, label, hint]) => (
                <label key={key} className="rc-layout-check flex cursor-pointer items-start gap-2.5 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" checked={Boolean(draft[key])} onChange={(e) => set(key, e.target.checked)} />
                  <span>
                    <span className="font-medium text-slate-700">{label}</span>
                    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
                    {errorText(key)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {uses("signatures") && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Signatures</p>
              {errorText("signatures")}
              <div className="space-y-2">
                {draft.signatures.map((label, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <TextInput
                        value={label}
                        maxLength={40}
                        aria-label={`Signature ${i + 1}`}
                        invalid={Boolean(err(`signatures[${i}]`))}
                        onChange={(e) => setSignature(i, e.target.value)}
                      />
                      <IconButton icon={Trash2} label={`Remove signature ${i + 1}`} onClick={() => set("signatures", draft.signatures.filter((_, j) => j !== i))} />
                    </div>
                    {errorText(`signatures[${i}]`)}
                  </div>
                ))}
              </div>
              {draft.signatures.length < MAX_SIGNATURES && (
                <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => set("signatures", [...draft.signatures, ""])}>
                  Add signature
                </Button>
              )}
            </div>
          )}

          {uses("footerText") && (
            <Field label="Footer note" htmlFor="rcl-footer" error={err("footerText")} hint="Leave empty to print the school's phone and email instead.">
              <TextArea id="rcl-footer" rows={3} maxLength={600} value={draft.footerText} invalid={Boolean(err("footerText"))} onChange={(e) => set("footerText", e.target.value)} />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {state.isCustom && (
              <Button variant="ghost" icon={RotateCcw} onClick={handleReset} disabled={saving}>
                Back to original
              </Button>
            )}
            <span className="flex-1" />
            {dirty && (
              <Button variant="secondary" onClick={() => apply(state)} disabled={saving}>
                Discard changes
              </Button>
            )}
            <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
              Save layout
            </Button>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto xl:sticky xl:top-20">
          <p className="mb-2 text-xs text-slate-500">Preview — sample student, graded on your default grade scale</p>
          {/* The real report-card component at half size. */}
          <div className="rc-layout-preview rounded-xl border border-slate-200 bg-slate-200 p-4 [zoom:0.5]">
            <NepalReportCard data={preview} showActions={false} />
          </div>
        </div>
      </div>
    </Shell>
  );
};

export default ReportCardLayoutSettings;
