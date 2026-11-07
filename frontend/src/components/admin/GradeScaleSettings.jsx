import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { gradeScaleService } from "../../api/gradeScaleService";

/**
 * School Settings -> Grade Scales.
 *
 * The backend validates everything (contiguous bands, no gaps or overlaps,
 * 0-100 coverage) and returns per-field errors keyed like `bands[2].max`;
 * this component only displays them. It never decides a grade itself.
 */

const emptyBand = () => ({
  grade: "",
  min: "",
  max: "",
  gpa: "",
  description: "",
  isPassing: true,
});

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

const GradeScaleSettings = () => {
  const [scales, setScales] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editor, setEditor] = useState(null); // { id, name, passPercent, bands }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [list, presetList] = await Promise.all([
        gradeScaleService.getAll(),
        gradeScaleService.getPresets(),
      ]);
      setScales(list.data.data || []);
      setPresets(presetList.data.data || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Could not load grade scales",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (type, text) => {
    setMessage({ type, text });
    if (type === "success") {
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  const openEditor = (source, { asCopy = false } = {}) => {
    setErrors({});
    setMessage({ type: "", text: "" });
    setEditor({
      id: asCopy ? null : source.id ?? null,
      name: asCopy ? uniqueName(source.name, scales) : source.name,
      passPercent: String(source.passPercent ?? 35),
      bands: toEditorBands(source.bands || []),
    });
  };

  const startFromPreset = (key) => {
    const preset = presets.find((p) => p.key === key);
    if (preset) openEditor(preset, { asCopy: true });
  };

  const updateBand = (index, field, value) => {
    setEditor((ed) => ({
      ...ed,
      bands: ed.bands.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));
  };

  const removeBand = (index) => {
    setEditor((ed) => ({ ...ed, bands: ed.bands.filter((_, i) => i !== index) }));
    setErrors({}); // indexes shift; stale errors would point at the wrong row
  };

  const addBand = () => {
    setEditor((ed) => ({ ...ed, bands: [...ed.bands, emptyBand()] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
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
      flash("success", `Grade scale "${payload.name}" saved.`);
      await load();
    } catch (error) {
      const list = error.response?.data?.errors;
      if (Array.isArray(list) && list.length) {
        const map = {};
        list.forEach((e) => {
          if (e.field && !map[e.field]) map[e.field] = e.message;
        });
        setErrors(map);
        flash("error", `Please fix ${list.length} problem(s) in the scale below.`);
      } else {
        flash("error", error.response?.data?.message || "Could not save the grade scale");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (scale) => {
    const ok = window.confirm(
      `Make "${scale.name}" the default?\n\n` +
        "Marks saved and report cards generated from now on will use it. " +
        "Report cards already generated keep the scale they were made with " +
        "until you generate them again."
    );
    if (!ok) return;
    setBusyId(scale.id);
    try {
      await gradeScaleService.setDefault(scale.id);
      flash("success", `"${scale.name}" is now the default grade scale.`);
      await load();
    } catch (error) {
      flash("error", error.response?.data?.message || "Could not change the default");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (scale) => {
    if (!window.confirm(`Delete the grade scale "${scale.name}"?`)) return;
    setBusyId(scale.id);
    try {
      await gradeScaleService.remove(scale.id);
      flash("success", `"${scale.name}" deleted.`);
      await load();
    } catch (error) {
      flash("error", error.response?.data?.message || "Could not delete the grade scale");
    } finally {
      setBusyId(null);
    }
  };

  const fieldError = (key) =>
    errors[key] ? <span className="field-error">{errors[key]}</span> : null;

  const cellClass = (key) => (errors[key] ? "input-error" : "");

  return (
    <div className="card grade-scales">
      <h3 className="card-title">
        <BarChart3 size={20} /> Grade Scales
      </h3>
      <p className="text-muted grade-scales-intro">
        The scale turns marks into letter grades and grade points on marks
        entry and report cards. The default scale is used for new marks and
        newly generated report cards; a report card keeps the scale it was
        generated with.
      </p>

      {message.text && (
        <div className={`grade-scales-message is-${message.type}`}>
          {message.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="grade-scales-loading">
          <Loader2 className="spinner" size={20} /> Loading grade scales...
        </div>
      ) : (
        <>
          {scales.length === 0 && (
            <p className="grade-scales-empty">
              No grade scales set up yet, so the built-in NEB 8-band scale is in
              use. Start one from a preset below.
            </p>
          )}

          <div className="grade-scales-list">
            {scales.map((scale) => (
              <div key={scale.id} className="grade-scale-item">
                <div className="grade-scale-head">
                  <div className="grade-scale-name">
                    <strong>{scale.name}</strong>
                    {scale.isDefault && <span className="badge badge-success">Default</span>}
                    {scale.isLocked && (
                      <span
                        className="badge badge-secondary"
                        title="Used by generated report cards, so it can no longer be edited"
                      >
                        <Lock size={12} /> Used by {scale.reportCardCount} report card(s)
                      </span>
                    )}
                  </div>
                  <div className="grade-scale-actions">
                    {!scale.isDefault && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        disabled={busyId === scale.id}
                        onClick={() => handleMakeDefault(scale)}
                      >
                        <Star size={14} /> Make default
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      disabled={scale.isLocked}
                      title={scale.isLocked ? "In use: duplicate it and edit the copy" : ""}
                      onClick={() => openEditor(scale)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => openEditor(scale, { asCopy: true })}
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    {!scale.isDefault && !scale.isLocked && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small grade-scale-delete"
                        disabled={busyId === scale.id}
                        onClick={() => handleDelete(scale)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="grade-scale-meta text-muted">
                  {scale.passPercent > 0
                    ? `Theory or practical below ${scale.passPercent}% fails the subject, which then prints ${scale.failGrade}.`
                    : "No component pass mark: a low theory or practical score is graded, not failed."}
                </div>
                <div className="grade-scale-bands">
                  {scale.bands.map((b) => (
                    <span
                      key={b.grade}
                      className={`grade-scale-band${b.isPassing ? "" : " is-failing"}`}
                      title={b.description || ""}
                    >
                      <strong>{b.grade}</strong> {b.min}–{b.max}% · {b.gpa.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!editor && presets.length > 0 && (
            <div className="grade-scales-new">
              <span className="text-muted">New scale from a preset:</span>
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => startFromPreset(p.key)}
                >
                  <Plus size={14} /> {p.name}
                </button>
              ))}
            </div>
          )}

          {editor && (
            <div className="grade-scale-editor">
              <h4>{editor.id ? `Edit "${editor.name}"` : "New grade scale"}</h4>

              <div className="grade-scale-editor-fields">
                <div className="form-group">
                  <label htmlFor="gs-name">Name</label>
                  <input
                    id="gs-name"
                    value={editor.name}
                    maxLength={100}
                    className={cellClass("name")}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  />
                  {fieldError("name")}
                </div>
                <div className="form-group">
                  <label htmlFor="gs-pass">Component pass mark (%)</label>
                  <input
                    id="gs-pass"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editor.passPercent}
                    className={cellClass("passPercent")}
                    onChange={(e) => setEditor({ ...editor, passPercent: e.target.value })}
                  />
                  {fieldError("passPercent")}
                  <small className="text-muted">
                    Theory or practical below this fails the subject. 0 = no
                    such rule.
                  </small>
                </div>
              </div>

              {fieldError("bands")}
              <div className="grade-scale-table-wrap">
                <table className="data-table grade-scale-table">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>From %</th>
                      <th>To %</th>
                      <th>Grade point</th>
                      <th>Description</th>
                      <th>Passing</th>
                      <th aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody>
                    {editor.bands.map((b, i) => {
                      const k = (f) => `bands[${i}].${f}`;
                      return (
                        <tr key={i}>
                          <td>
                            <input
                              value={b.grade}
                              maxLength={5}
                              className={cellClass(k("grade"))}
                              onChange={(e) => updateBand(i, "grade", e.target.value)}
                              aria-label={`Band ${i + 1} grade`}
                            />
                            {fieldError(k("grade"))}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={b.min}
                              className={cellClass(k("min"))}
                              onChange={(e) => updateBand(i, "min", e.target.value)}
                              aria-label={`Band ${i + 1} from percent`}
                            />
                            {fieldError(k("min"))}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={b.max}
                              className={cellClass(k("max"))}
                              onChange={(e) => updateBand(i, "max", e.target.value)}
                              aria-label={`Band ${i + 1} to percent`}
                            />
                            {fieldError(k("max"))}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="9.99"
                              step="0.1"
                              value={b.gpa}
                              className={cellClass(k("gpa"))}
                              onChange={(e) => updateBand(i, "gpa", e.target.value)}
                              aria-label={`Band ${i + 1} grade point`}
                            />
                            {fieldError(k("gpa"))}
                          </td>
                          <td>
                            <input
                              value={b.description}
                              maxLength={100}
                              className={cellClass(k("description"))}
                              onChange={(e) => updateBand(i, "description", e.target.value)}
                              aria-label={`Band ${i + 1} description`}
                            />
                            {fieldError(k("description"))}
                          </td>
                          <td className="grade-scale-passing">
                            <input
                              type="checkbox"
                              checked={b.isPassing}
                              onChange={(e) => updateBand(i, "isPassing", e.target.checked)}
                              aria-label={`Band ${i + 1} is passing`}
                            />
                            {fieldError(k("isPassing"))}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon btn-danger"
                              onClick={() => removeBand(i)}
                              aria-label={`Remove band ${i + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-muted grade-scale-hint">
                Each band's "To %" must equal the next band's "From %". A score
                exactly on a boundary gets the higher grade.
              </p>

              <div className="grade-scale-editor-actions">
                <button type="button" className="btn btn-secondary" onClick={addBand}>
                  <Plus size={16} /> Add band
                </button>
                <span className="grade-scale-spacer" />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditor(null);
                    setErrors({});
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="spinner" size={16} /> : <Save size={16} />}
                  Save scale
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GradeScaleSettings;
