import React, { useState } from "react";
import Modal from "../common/Modal";
import { Button, DialogActions, Field, SelectInput, TextArea, Alert } from "../ui";

/**
 * Ask for a reason (or an optional note) before an action: reversal requests,
 * approvals and rejections, revoking a discount, cancelling a fee.
 *
 * Mount only while open. onSubmit({ text, category }) returns a promise; a
 * thrown error's server message is shown in the dialog.
 */
const ReasonDialog = ({
  title,
  description,
  label = "Reason",
  required = true,
  minLength = 5,
  categories = null,
  confirmLabel = "Confirm",
  tone = "primary",
  children,
  onSubmit,
  onClose,
}) => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories?.[0]?.value || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (required && text.trim().length < minLength) return setError(`Please write at least ${minLength} characters.`);
    setSaving(true);
    setError("");
    try {
      await onSubmit({ text: text.trim(), category });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title={title} description={description} size="md">
      <form onSubmit={submit} noValidate>
        {children}
        {categories && (
          <Field label="Type" htmlFor="reason-category" className="mb-4">
            <SelectInput id="reason-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label={required ? label : `${label} (optional)`} htmlFor="reason-text">
          <TextArea id="reason-text" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </Field>
        {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={saving}>{confirmLabel}</Button>
        </DialogActions>
      </form>
    </Modal>
  );
};

export default ReasonDialog;
