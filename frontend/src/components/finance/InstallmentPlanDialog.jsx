import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save, SplitSquareHorizontal } from "lucide-react";
import Modal from "../common/Modal";
import { Button, DialogActions, IconButton, TextInput, Alert, LoadingBlock, toast } from "../ui";
import { cn } from "../../lib/cn";
import { feeService } from "../../api/feeService";
import { formatCurrency } from "../../utils/format";
import { toPaisa, fromPaisa, isMoneyInput } from "./financeLabels";

/**
 * Edit a fee structure's installment plan: when, and in what parts, the fee
 * falls due. Copied into each student's fee when fees are generated; students
 * who already have this fee keep their own schedule. Mount only while open.
 */
const InstallmentPlanDialog = ({ structure, onClose, onSaved }) => {
  const [rows, setRows] = useState(null);
  const [splitCount, setSplitCount] = useState("3");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const totalPaisa = toPaisa(Number(structure.amount).toFixed(2));

  useEffect(() => {
    feeService
      .getInstallmentPlan(structure.id)
      .then((res) =>
        setRows(
          (res.data.installmentPlan || []).map((p) => ({
            label: p.label,
            dueDate: p.dueDate ? String(p.dueDate).slice(0, 10) : "",
            amount: Number(p.amount).toFixed(2),
          })),
        ),
      )
      .catch(() => setError("Could not load the plan"));
  }, [structure.id]);

  const sumPaisa = (rows || []).reduce((s, r) => s + (isMoneyInput(r.amount) ? toPaisa(r.amount) : 0), 0);
  const update = (idx, key, value) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const splitEvenly = () => {
    const n = Math.min(24, Math.max(1, parseInt(splitCount) || 1));
    const base = Math.floor(totalPaisa / n);
    setRows(
      Array.from({ length: n }, (_, i) => ({
        label: n === 1 ? "Full amount" : `Installment ${i + 1}`,
        dueDate: rows?.[i]?.dueDate || "",
        amount: fromPaisa(i === n - 1 ? totalPaisa - base * (n - 1) : base),
      })),
    );
  };

  const save = async () => {
    if (rows.some((r) => !r.label.trim())) return setError("Every installment needs a label.");
    if (rows.some((r) => !isMoneyInput(r.amount))) return setError("Every amount must be more than 0, with at most 2 decimals.");
    if (rows.length && sumPaisa !== totalPaisa) return setError(`The installments add up to ${formatCurrency(sumPaisa / 100)}, but the fee is ${formatCurrency(totalPaisa / 100)}.`);
    setSaving(true);
    setError("");
    try {
      const res = await feeService.setInstallmentPlan(
        structure.id,
        rows.map((r) => ({ label: r.label.trim(), dueDate: r.dueDate || null, amount: fromPaisa(toPaisa(r.amount)) })),
      );
      toast.success(res.message || "Installment plan saved");
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the plan");
      setSaving(false);
    }
  };

  const generated = structure._count?.feeObligations || 0;

  return (
    <Modal
      isOpen
      onClose={saving ? () => {} : onClose}
      title="Installment plan"
      description={`${structure.feeType?.name} · ${structure.class?.name} · ${structure.academicYear?.name} · ${formatCurrency(structure.amount)}`}
      size="lg"
    >
      {rows === null && !error ? (
        <LoadingBlock text="Loading plan…" />
      ) : (
        <div className="space-y-4">
          {generated > 0 && (
            <Alert tone="info">
              {generated} student{generated === 1 ? " already has" : "s already have"} this fee. They keep their current schedule; the plan applies to fees generated from now on.
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
            <span className="text-slate-600">Split evenly into</span>
            <TextInput
              aria-label="Number of installments"
              inputMode="numeric"
              value={splitCount}
              onChange={(e) => setSplitCount(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="h-8 w-14 text-center"
            />
            <span className="text-slate-600">installments</span>
            <Button size="sm" variant="secondary" icon={SplitSquareHorizontal} onClick={splitEvenly}>Split</Button>
            <span className="text-xs text-slate-500">e.g. 12 for monthly, 3 for each term</span>
          </div>

          {rows?.length ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Due date</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <TextInput aria-label={`Label ${idx + 1}`} value={r.label} maxLength={100} onChange={(e) => update(idx, "label", e.target.value)} className="h-9" />
                      </td>
                      <td className="px-2 py-2">
                        <TextInput aria-label={`Due date ${idx + 1}`} type="date" value={r.dueDate} onChange={(e) => update(idx, "dueDate", e.target.value)} className="h-9" />
                      </td>
                      <td className="px-2 py-2">
                        <TextInput
                          aria-label={`Amount ${idx + 1}`}
                          inputMode="decimal"
                          value={r.amount}
                          onChange={(e) => update(idx, "amount", e.target.value.replace(/[^\d.]/g, ""))}
                          className="h-9 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <IconButton icon={Trash2} size="sm" label={`Remove installment ${idx + 1}`} onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={cn("font-semibold", sumPaisa === totalPaisa ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                    <td className="px-3 py-2" colSpan={3}>
                      {sumPaisa === totalPaisa ? "Adds up to the fee" : `Difference ${formatCurrency((totalPaisa - sumPaisa) / 100)}`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(sumPaisa / 100)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              No plan: students pay the whole {formatCurrency(structure.amount)} in one go, with no due date.
            </p>
          )}

          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setRows((rs) => [...(rs || []), { label: `Installment ${(rs?.length || 0) + 1}`, dueDate: "", amount: "" }])}>
            Add installment
          </Button>

          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      )}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button icon={Save} loading={saving} onClick={save} disabled={rows === null}>
          {rows?.length ? "Save plan" : "Save without a plan"}
        </Button>
      </DialogActions>
    </Modal>
  );
};

export default InstallmentPlanDialog;
