import React, { useEffect, useState } from "react";
import { BarChart3, Copy, Lock, Pencil, Plus, Save, Star, Trash2 } from "lucide-react";
import { gradeScaleService } from "../../api/gradeScaleService";
import { cn } from "../../lib/cn";
import { Alert, Badge, Button, Card, CardHeader, Field, IconButton, LoadingBlock, TextInput, toast, confirmDialog } from "../ui";

/**
 * School Settings -> Grade Scales.
 *
 * The backend validates everything (contiguous bands, no gaps or overlaps,
 * 0-100 coverage) and returns per-field errors keyed like `bands[2].max`;
 * this component only displays them. It never decides a grade itself.
 */

const emptyBand = () => ({ grade: "", min: "", max: "", gpa: "", description: "", isPassing: true });

// Bands from the API are numbers; the editor keeps strings so inputs can be blank.
const toEditorBands = (bands) =>
  bands.map((b) => ({
    grade: b.grade,
    min: String(b.min),
    max: String(b.max),
    gpa: String(b.gpa),
    description: b.description || "",
    isPassing: b.isPassing !== false,
  }));

// Blank -> null so the server reports "required" instead of reading it as 0.
const numOrNull = (v) => (v === "" || v === null ? null : Number(v));

const uniqueName = (base, scales) => {
  const taken = new Set(scales.map((s) => s.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${base} (copy)` : `${base} (copy ${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
};

const cellInput = "h-9 px-2.5";

const GradeScaleSettings = () => {
  const [scales, setScales] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [problem, setProblem] = useState("");
  const [editor, setEditor] = useState(null); // { id, name, passPercent, bands }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [list, presetList] = await Promise.all([gradeScaleService.getAll(), gradeScaleService.getPresets()]);
      setScales(list.data.data || []);
      setPresets(presetList.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load grade scales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (source, { asCopy = false } = {}) => {
    setErrors({});
    setProblem("");
    setEditor({
      id: asCopy ? null : source.id ?? null,
      name: asCopy ? uniqueName(source.name, scales) : source.name,
      passPercent: String(source.passPercent ?? 35),
      bands: toEditorBands(source.bands || []),
    });
  };

  const closeEditor = () => {
    setEditor(null);
    setErrors({});
    setProblem("");
  };

  const startFromPreset = (key) => {
    const preset = presets.find((p) => p.key === key);
    if (preset) openEditor(preset, { asCopy: true });
  };

  const updateBand = (index, field, value) => {
    setEditor((ed) => ({ ...ed, bands: ed.bands.map((b, i) => (i === index ? { ...b, [field]: value } : b)) }));
  };

  const removeBand = (index) => {
    setEditor((ed) => ({ ...ed, bands: ed.bands.filter((_, i) => i !== index) }));
    setErrors({}); // indexes shift; stale errors would point at the wrong row
  };

  const addBand = () => setEditor((ed) => ({ ...ed, bands: [...ed.bands, emptyBand()] }));

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    setProblem("");
    const payload = {
      name: editor.name,
      passPercent: numOrNull(editor.passPercent),
      bands: editor.bands.map((b) => ({
        grade: b.grade,
        min: numOrNull(b.min),
        max: numOrNull(b.max),
        gpa: numOrNull(b.gpa),
        description: b.description,
        isPassing: b.isPassing,
      })),
    };

    try {
      if (editor.id) await gradeScaleService.update(editor.id, payload);
      else await gradeScaleService.create(payload);
      setEditor(null);
      toast.success(`Grade scale "${payload.name}" saved`);
      await load();
    } catch (error) {
      const list = error.response?.data?.errors;
      if (Array.isArray(list) && list.length) {
        const map = {};
        list.forEach((e) => {
          if (e.field && !map[e.field]) map[e.field] = e.message;
        });
        setErrors(map);
        setProblem(`Please fix ${list.length} problem(s) in the scale below.`);
      } else {
        toast.error(error.response?.data?.message || "Could not save the grade scale");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (scale) => {
    const ok = await confirmDialog({
      title: `Make "${scale.name}" the default?`,
      message:
        "Marks saved and report cards generated from now on will use it. Report cards already generated keep the scale they were made with until you generate them again.",
      confirmLabel: "Make default",
    });
    if (!ok) return;
    setBusyId(scale.id);
    try {
      await gradeScaleService.setDefault(scale.id);
      toast.success(`"${scale.name}" is now the default grade scale`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not change the default");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (scale) => {
    const ok = await confirmDialog({ title: `Delete "${scale.name}"?`, message: "This cannot be undone.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    setBusyId(scale.id);
    try {
      await gradeScaleService.remove(scale.id);
      toast.success(`"${scale.name}" deleted`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the grade scale");
    } finally {
      setBusyId(null);
    }
  };

  const errorText = (key) => (errors[key] ? <p className="field-error mt-1 text-xs font-medium text-red-600">{errors[key]}</p> : null);

  return (
    <Card className="grade-scales">
      <CardHeader
        icon={BarChart3}
        title="Grade scales"
        description="Turns marks into letter grades and grade points on marks entry and report cards. The default scale is used for new marks and newly generated report cards; a report card keeps the scale it was generated with."
      />

      {loading ? (
        <LoadingBlock text="Loading grade scales…" />
      ) : (
        <div className="space-y-4">
          {scales.length === 0 && (
            <Alert tone="info">No grade scales set up yet, so the built-in NEB 8-band scale is in use. Start one from a preset below.</Alert>
          )}

          {scales.map((scale) => (
            <div key={scale.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{scale.name}</h4>
                    {scale.isDefault && <Badge tone="success" dot>Default</Badge>}
                    {scale.isLocked && (
                      <Badge tone="neutral" icon={Lock}>
                        <span title="Used by generated report cards, so it can no longer be edited">Used by {scale.reportCardCount} report card(s)</span>
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {scale.passPercent > 0
                      ? `Theory or practical below ${scale.passPercent}% fails the subject, which then prints ${scale.failGrade}.`
                      : "No component pass mark: a low theory or practical score is graded, not failed."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!scale.isDefault && (
                    <Button size="sm" variant="secondary" icon={Star} disabled={busyId === scale.id} onClick={() => handleMakeDefault(scale)}>
                      Make default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Pencil}
                    disabled={scale.isLocked}
                    title={scale.isLocked ? "In use: duplicate it and edit the copy" : undefined}
                    onClick={() => openEditor(scale)}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" icon={Copy} onClick={() => openEditor(scale, { asCopy: true })}>
                    Duplicate
                  </Button>
                  {!scale.isDefault && !scale.isLocked && (
                    <IconButton icon={Trash2} label={`Delete ${scale.name}`} variant="danger-soft" size="sm" disabled={busyId === scale.id} onClick={() => handleDelete(scale)} />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {scale.bands.map((b) => (
                  <span
                    key={b.grade}
                    title={b.description || undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ring-1 ring-inset",
                      b.isPassing ? "bg-slate-50 text-slate-700 ring-slate-200" : "bg-red-50 text-red-700 ring-red-200",
                    )}
                  >
                    <strong className="font-semibold">{b.grade}</strong>
                    <span className="tabular-nums">{b.min}–{b.max}%</span>
                    <span className="text-slate-400">·</span>
                    <span className="tabular-nums">{b.gpa.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {!editor && presets.length > 0 && (
            <div className="grade-scales-new flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3">
              <span className="text-sm text-slate-500">New scale from a preset:</span>
              {presets.map((p) => (
                <Button key={p.key} size="sm" variant="secondary" icon={Plus} onClick={() => startFromPreset(p.key)}>
                  {p.name}
                </Button>
              ))}
            </div>
          )}

          {editor && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
              <h4 className="mb-4 font-semibold text-slate-900">{editor.id ? `Edit "${editor.name}"` : "New grade scale"}</h4>

              {problem && <Alert tone="danger" className="mb-4">{problem}</Alert>}

              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="gs-name" error={errors.name}>
                  <TextInput id="gs-name" value={editor.name} maxLength={100} invalid={Boolean(errors.name)} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
                </Field>
                <Field
                  label="Component pass mark (%)"
                  htmlFor="gs-pass"
                  error={errors.passPercent}
                  hint="Theory or practical below this fails the subject. 0 = no such rule."
                >
                  <TextInput
                    id="gs-pass"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editor.passPercent}
                    invalid={Boolean(errors.passPercent)}
                    onChange={(e) => setEditor({ ...editor, passPercent: e.target.value })}
                  />
                </Field>
              </div>

              {errorText("bands")}
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Grade</th>
                      <th className="px-3 py-2 font-medium">From %</th>
                      <th className="px-3 py-2 font-medium">To %</th>
                      <th className="px-3 py-2 font-medium">Grade point</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-center font-medium">Passing</th>
                      <th className="px-3 py-2"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editor.bands.map((b, i) => {
                      const k = (f) => `bands[${i}].${f}`;
                      const numberCell = (field, label, opts) => (
                        <td className="px-2 py-2 align-top">
                          <TextInput
                            type="number"
                            {...opts}
                            value={b[field]}
                            invalid={Boolean(errors[k(field)])}
                            className={cn(cellInput, "w-24")}
                            onChange={(e) => updateBand(i, field, e.target.value)}
                            aria-label={`Band ${i + 1} ${label}`}
                          />
                          {errorText(k(field))}
                        </td>
                      );
                      return (
                        <tr key={i}>
                          <td className="px-2 py-2 align-top">
                            <TextInput
                              value={b.grade}
                              maxLength={5}
                              invalid={Boolean(errors[k("grade")])}
                              className={cn(cellInput, "w-20 font-semibold")}
                              onChange={(e) => updateBand(i, "grade", e.target.value)}
                              aria-label={`Band ${i + 1} grade`}
                            />
                            {errorText(k("grade"))}
                          </td>
                          {numberCell("min", "from percent", { min: "0", max: "100", step: "0.01" })}
                          {numberCell("max", "to percent", { min: "0", max: "100", step: "0.01" })}
                          {numberCell("gpa", "grade point", { min: "0", max: "9.99", step: "0.1" })}
                          <td className="px-2 py-2 align-top">
                            <TextInput
                              value={b.description}
                              maxLength={100}
                              invalid={Boolean(errors[k("description")])}
                              className={cellInput}
                              onChange={(e) => updateBand(i, "description", e.target.value)}
                              aria-label={`Band ${i + 1} description`}
                            />
                            {errorText(k("description"))}
                          </td>
                          <td className="px-2 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer"
                              checked={b.isPassing}
                              onChange={(e) => updateBand(i, "isPassing", e.target.checked)}
                              aria-label={`Band ${i + 1} is passing`}
                            />
                            {errorText(k("isPassing"))}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <IconButton icon={Trash2} label={`Remove band ${i + 1}`} variant="ghost" size="sm" onClick={() => removeBand(i)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Each band's "To %" must equal the next band's "From %". A score exactly on a boundary gets the higher grade.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={Plus} onClick={addBand}>Add band</Button>
                <span className="flex-1" />
                <Button variant="secondary" onClick={closeEditor} disabled={saving}>Cancel</Button>
                <Button icon={Save} onClick={handleSave} loading={saving}>Save scale</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default GradeScaleSettings;
