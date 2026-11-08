import React, { useEffect, useState } from "react";
import { BadgePercent } from "lucide-react";
import Modal from "../common/Modal";
import { Button, DialogActions, Field, SelectInput, TextInput, TextArea, Alert, toast } from "../ui";
import { cn } from "../../lib/cn";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import StudentPicker from "./StudentPicker";
import { isMoneyInput } from "./financeLabels";

/**
 * Request a discount or scholarship. It is saved as "awaiting approval"; an
 * administrator other than the requester approves it before it changes any
 * balance. Mount only while open.
 *
 * student: { studentId, name, … } to fix the student, or null to pick one.
 */
const DiscountDialog = ({ student: fixedStudent = null, academicYearId: fixedYearId = null, onClose, onSaved }) => {
  const [student, setStudent] = useState(fixedStudent);
  const [years, setYears] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [form, setForm] = useState({
    academicYearId: fixedYearId ? String(fixedYearId) : "",
    feeTypeId: "",
    kind: "PERCENT",
    value: "",
    category: "DISCOUNT",
    name: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), feeService.getFeeTypes({ isActive: "true" })])
      .then(([y, t]) => {
        setYears(y.data || []);
        setFeeTypes(t.data || []);
        if (!fixedYearId) {
          const current = (y.data || []).find((x) => x.isCurrent);
          if (current) setForm((f) => (f.academicYearId ? f : { ...f, academicYearId: String(current.id) }));
        }
      })
      .catch(() => setError("Could not load years and fee types"));
  }, [fixedYearId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!student) return setError("Choose a student.");
    if (!form.academicYearId) return setError("Choose an academic year.");
    if (!isMoneyInput(form.value)) return setError("Enter a value greater than 0 (at most 2 decimals).");
    if (form.kind === "PERCENT" && Number(form.value) > 100) return setError("A percentage cannot be more than 100.");
    if (form.name.trim().length < 2) return setError("Give it a short name, e.g. Sibling discount.");
    if (form.reason.trim().length < 5) return setError("Explain why, in at least 5 characters.");
    setSaving(true);
    setError("");
    try {
      const res = await feeService.requestDiscount({
        studentId: student.studentId,
        academicYearId: Number(form.academicYearId),
        feeTypeId: form.feeTypeId ? Number(form.feeTypeId) : null,
        kind: form.kind,
        value: form.value,
        category: form.category,
        name: form.name.trim(),
        reason: form.reason.trim(),
      });
      toast.success(res.message || "Discount requested");
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the request");
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title="Request a discount or scholarship" description="An administrator approves it before it changes the student's balance." size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Student" htmlFor="discount-student">
          {fixedStudent ? (
            <p className="text-sm font-medium text-slate-900">{fixedStudent.name}</p>
          ) : (
            <StudentPicker value={student} onChange={setStudent} academicYearId={form.academicYearId || undefined} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic year" htmlFor="discount-year">
            <SelectInput id="discount-year" value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)} disabled={Boolean(fixedYearId)}>
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (current)" : ""}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Applies to" htmlFor="discount-feetype">
            <SelectInput id="discount-feetype" value={form.feeTypeId} onChange={(e) => set("feeTypeId", e.target.value)}>
              <option value="">All of the student's fees</option>
              {feeTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} only</option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kind" htmlFor="discount-kind">
            <div id="discount-kind" role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { value: "PERCENT", label: "Percentage" },
                { value: "FIXED", label: "Fixed amount" },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === o.value}
                  onClick={() => set("kind", o.value)}
                  className={cn("cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium", form.kind === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label={form.kind === "PERCENT" ? "Percentage (%)" : "Amount (Rs.)"}
            htmlFor="discount-value"
            hint={form.kind === "PERCENT" ? "Of each fee's original amount" : "Split across the matching fees"}
          >
            <TextInput id="discount-value" inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value.replace(/[^\d.]/g, ""))} placeholder={form.kind === "PERCENT" ? "e.g. 10" : "e.g. 2000"} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="discount-category">
            <SelectInput id="discount-category" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="DISCOUNT">Discount</option>
              <option value="SCHOLARSHIP">Scholarship</option>
            </SelectInput>
          </Field>
          <Field label="Name" htmlFor="discount-name">
            <TextInput id="discount-name" maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sibling discount" />
          </Field>
        </div>

        <Field label="Reason" htmlFor="discount-reason" hint="The approving administrator sees this.">
          <TextArea id="discount-reason" rows={3} maxLength={500} value={form.reason} onChange={(e) => set("reason", e.target.value)} />
        </Field>

        {error && <Alert tone="danger">{error}</Alert>}

        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" icon={BadgePercent} loading={saving}>Send for approval</Button>
        </DialogActions>
      </form>
    </Modal>
  );
};

export default DiscountDialog;
