import React, { useMemo, useState } from "react";
import { Wallet, ListChecks, Sparkles } from "lucide-react";
import Modal from "../common/Modal";
import { Button, DialogActions, Field, SelectInput, TextInput, TextArea, Alert, toast } from "../ui";
import { cn } from "../../lib/cn";
import { feeService } from "../../api/feeService";
import { formatCurrency, formatDate } from "../../utils/format";
import { PAYMENT_METHODS, toPaisa, fromPaisa, isMoneyInput } from "./financeLabels";

const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const dueKey = (i) => i.dueDate || "9999-12-31";

/**
 * Record a payment for one student and academic year.
 *
 * Mount it only while open ({open && <PaymentDialog …/>}): the idempotency key
 * is created on mount, so pressing Save twice, or retrying after a network
 * error, returns the same receipt instead of charging twice.
 *
 * "Automatic" lets the server settle the oldest dues first; "Choose" lets the
 * accountant split the amount across installments. The server checks every
 * amount against the real balance; the preview here is only a guide.
 */
const PaymentDialog = ({ studentId, studentName, year, onClose, onPaid }) => {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState("auto");
  const [amount, setAmount] = useState("");
  const [picked, setPicked] = useState({}); // installmentId -> amount string
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(localToday);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const payable = useMemo(
    () =>
      (year?.fees || [])
        .filter((f) => !f.cancelled)
        .flatMap((f) => f.installments.filter((i) => i.balance > 0).map((i) => ({ ...i, feeName: f.feeType?.name })))
        .sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || a.sequence - b.sequence),
    [year],
  );
  const owedPaisa = payable.reduce((s, i) => s + Math.round(i.balance * 100), 0);
  const overduePaisa = payable.filter((i) => i.overdue).reduce((s, i) => s + Math.round(i.balance * 100), 0);

  const manualPaisa = Object.values(picked).reduce((s, v) => s + (isMoneyInput(v) ? toPaisa(v) : 0), 0);
  const totalPaisa = mode === "auto" ? toPaisa(amount) : manualPaisa;

  // Preview of where an automatic payment goes (oldest due first).
  const preview = useMemo(() => {
    if (mode !== "auto" || !isMoneyInput(amount)) return [];
    let left = toPaisa(amount);
    const out = [];
    for (const i of payable) {
      if (left <= 0) break;
      const take = Math.min(left, Math.round(i.balance * 100));
      out.push({ ...i, take });
      left -= take;
    }
    return out;
  }, [mode, amount, payable]);

  const problem = (() => {
    if (!Number.isFinite(totalPaisa) || totalPaisa <= 0) return mode === "auto" ? "Enter the amount received." : "Enter an amount for at least one installment.";
    if (totalPaisa > owedPaisa) return `That is more than the ${formatCurrency(owedPaisa / 100)} owed.`;
    if (mode === "manual") {
      for (const i of payable) {
        const v = picked[i.id];
        if (v && !isMoneyInput(v)) return `Check the amount for ${i.feeName} · ${i.label}.`;
        if (v && toPaisa(v) > Math.round(i.balance * 100)) return `${i.feeName} · ${i.label}: only ${formatCurrency(i.balance)} is owed.`;
      }
    }
    if (paidOn > localToday()) return "The payment date cannot be in the future.";
    return "";
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      const body = {
        studentId,
        academicYearId: year.academicYear.id,
        amount: fromPaisa(totalPaisa),
        method,
        reference: reference.trim() || undefined,
        paidOn,
        remarks: remarks.trim() || undefined,
        idempotencyKey,
      };
      if (mode === "manual") {
        body.allocations = Object.entries(picked)
          .filter(([, v]) => isMoneyInput(v))
          .map(([installmentId, v]) => ({ installmentId: Number(installmentId), amount: fromPaisa(toPaisa(v)) }));
      }
      const res = await feeService.recordTransaction(body);
      toast.success(res.message || "Payment recorded");
      onPaid(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not record the payment. Nothing was saved; try again.");
    } finally {
      setSaving(false);
    }
  };

  const needsReference = method !== "cash";

  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title="Record payment" description={`${studentName} · ${year?.academicYear?.name}`} size="lg">
      <form onSubmit={submit} noValidate>
        {payable.length === 0 ? (
          <Alert tone="success">Nothing is owed for this year.</Alert>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="How to apply the payment">
              {[
                { value: "auto", label: "Automatic", hint: "Oldest dues first", icon: Sparkles },
                { value: "manual", label: "Choose installments", hint: "Split it yourself", icon: ListChecks },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === o.value}
                  onClick={() => setMode(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    mode === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <o.icon size={16} aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{o.label}</span>
                    <span className="block text-xs text-slate-500">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {mode === "auto" ? (
              <div className="mb-4">
                <Field label="Amount received (Rs.)" htmlFor="pay-amount" hint={`Owed this year: ${formatCurrency(owedPaisa / 100)}`}>
                  <TextInput
                    id="pay-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    className="h-12 text-lg font-semibold tabular-nums"
                    autoFocus
                  />
                </Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overduePaisa > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => setAmount(fromPaisa(overduePaisa))}>
                      Overdue {formatCurrency(overduePaisa / 100)}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setAmount(fromPaisa(owedPaisa))}>
                    Everything {formatCurrency(owedPaisa / 100)}
                  </Button>
                </div>
                {preview.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    {preview.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3">
                        <span>
                          {p.feeName} · {p.label}
                          {p.dueDate ? ` (due ${formatDate(p.dueDate)})` : ""}
                        </span>
                        <span className="font-medium tabular-nums text-slate-900">{formatCurrency(p.take / 100)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Installment</th>
                      <th className="px-3 py-2 text-right font-medium">Owed</th>
                      <th className="w-36 px-3 py-2 text-right font-medium">Paying now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payable.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{i.feeName}</p>
                          <p className={cn("text-xs text-slate-500", i.overdue && "text-red-600")}>
                            {i.label}
                            {i.dueDate ? ` · due ${formatDate(i.dueDate)}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(i.balance)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <TextInput
                              inputMode="decimal"
                              aria-label={`Paying now for ${i.feeName} ${i.label}`}
                              value={picked[i.id] || ""}
                              onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                              placeholder="0.00"
                              className="h-9 w-24 text-right tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => setPicked((p) => ({ ...p, [i.id]: fromPaisa(Math.round(i.balance * 100)) }))}
                              className="cursor-pointer rounded px-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            >
                              Full
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-3 py-2" colSpan={2}>Total</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(manualPaisa / 100)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Method" htmlFor="pay-method">
                <SelectInput id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Date received" htmlFor="pay-date">
                <TextInput id="pay-date" type="date" value={paidOn} max={localToday()} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
              <Field
                label={needsReference ? "Reference" : "Reference (optional)"}
                htmlFor="pay-ref"
                hint={needsReference ? "Transaction ID, cheque number or bank slip number" : undefined}
                className="sm:col-span-2"
              >
                <TextInput id="pay-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
              </Field>
              <Field label="Remarks (optional)" htmlFor="pay-remarks" className="sm:col-span-2">
                <TextArea id="pay-remarks" rows={2} className="min-h-0" maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {error && <Alert tone="danger" className="mt-4">{error}</Alert>}

        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          {payable.length > 0 && (
            <Button type="submit" icon={Wallet} loading={saving}>
              {Number.isFinite(totalPaisa) && totalPaisa > 0 ? `Record ${formatCurrency(totalPaisa / 100)}` : "Record payment"}
            </Button>
          )}
        </DialogActions>
      </form>
    </Modal>
  );
};

export default PaymentDialog;
