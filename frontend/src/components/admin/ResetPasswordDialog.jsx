import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, KeyRound, Printer } from "lucide-react";
import Modal from "../common/Modal";
import { accountService } from "../../api/accountService";
import { Alert, Button, Field, TextInput, toast } from "../ui";

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * The username and temporary password of an account, shown to the admin once,
 * with Copy and "Print login slip" (opens /admin/login-slips with this one slip).
 * `credential`: { userId, name, username, temporaryPassword, role?, class?, section?, rollNumber? }
 */
export const CredentialsResult = ({ credential, onDone }) => {
  const navigate = useNavigate();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${credential.username}\nTemporary password: ${credential.temporaryPassword}`);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy: select the text instead");
    }
  };
  return (
    <div className="space-y-4">
      <Alert tone="warning">This password is shown only now. Give it to {credential.name || "the user"}; they choose their own at the next sign-in.</Alert>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Username</dt>
          <dd className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-base font-semibold select-all">{credential.username}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Temporary password</dt>
          <dd className="credential-password mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-base font-semibold tracking-wide select-all">
            {credential.temporaryPassword}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={Copy} onClick={copy}>
          Copy
        </Button>
        <Button variant="secondary" icon={Printer} onClick={() => navigate("/admin/login-slips", { state: { credentials: [credential] } })}>
          Print login slip
        </Button>
        <span className="flex-1" />
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
};

/** Shows a just-created account's temporary password (when one was generated). */
export const NewAccountDialog = ({ credential, onClose }) => (
  <Modal isOpen={Boolean(credential)} onClose={onClose} title="Account created" size="md">
    {credential && <CredentialsResult credential={credential} onDone={onClose} />}
  </Modal>
);

/**
 * Reset someone's password: generate one (default) or type one. Afterwards
 * the temporary password is shown once. `account`: { userId, name, username, ... }
 */
const ResetPasswordDialog = ({ account, onClose }) => {
  const [mode, setMode] = useState("generate");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (!account) return null;
  const invalid = mode === "type" && !POLICY.test(typed);

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    try {
      const res = await accountService.resetPassword(account.userId, mode === "type" ? { password: typed } : {});
      setResult({ ...account, username: res.data.username, temporaryPassword: res.data.temporaryPassword });
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || "Could not reset the password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={result ? "Password reset" : `Reset password · ${account.name}`} size="md">
      {result ? (
        <CredentialsResult credential={result} onDone={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">
            {account.username && (
              <>
                Username <span className="font-mono font-semibold text-slate-900">{account.username}</span>.{" "}
              </>
            )}
            The current password stops working, every open session is signed out, and they choose a new password at the next sign-in.
          </p>
          <fieldset className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="reset-mode" checked={mode === "generate"} onChange={() => setMode("generate")} />
              Generate a temporary password
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="reset-mode" checked={mode === "type"} onChange={() => setMode("type")} />
              Type a password
            </label>
          </fieldset>
          {mode === "type" && (
            <Field
              label="Temporary password"
              htmlFor="reset-typed"
              hint="At least 8 characters with an upper-case letter, a lower-case letter and a number."
              error={typed && invalid ? "Does not meet the rule above" : undefined}
            >
              <TextInput id="reset-typed" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} invalid={Boolean(typed && invalid)} />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" icon={KeyRound} loading={busy} disabled={invalid}>
              Reset password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ResetPasswordDialog;
