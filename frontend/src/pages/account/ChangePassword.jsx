import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { accountService } from "../../api/accountService";
import { Alert, Button, Card, Field, TextInput, toast } from "../../components/ui";

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Change your own password. Also the page a user lands on after signing in
 * with a password an admin set (users.must_change_password): until they choose
 * their own, the API refuses everything else, and ProtectedRoute sends them here.
 * Standalone (no sidebar), so nothing else on screen calls the API meanwhile.
 */
const ChangePassword = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const forced = Boolean(user?.mustChangePassword);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setSaving(true);
    setError("");
    try {
      const res = await accountService.changePassword(currentPassword, newPassword);
      if (res.data?.accessToken) {
        // After an admin-set password: this device stays signed in.
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        await refreshUser();
        toast.success("Password changed. Welcome!");
        navigate("/dashboard", { replace: true });
      } else {
        toast.success("Password changed. Please sign in again.");
        await logout();
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || "Could not change the password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{forced ? "Choose your password" : "Change password"}</h1>
            <p className="text-sm text-slate-500">
              {user?.username ? (
                <>
                  Signed in as <span className="font-mono">{user.username}</span>
                </>
              ) : (
                user?.email
              )}
            </p>
          </div>
        </div>

        {forced && (
          <Alert tone="info" className="mb-4">
            You signed in with a temporary password from the school. Choose your own password to continue.
          </Alert>
        )}
        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={forced ? "Temporary password" : "Current password"} htmlFor="cp-current" error={errors.currentPassword?.message}>
            <TextInput id="cp-current" type="password" autoComplete="current-password" invalid={Boolean(errors.currentPassword)} {...register("currentPassword", { required: "Required" })} />
          </Field>
          <Field
            label="New password"
            htmlFor="cp-new"
            hint="At least 8 characters with an upper-case letter, a lower-case letter and a number."
            error={errors.newPassword?.message}
          >
            <TextInput
              id="cp-new"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.newPassword)}
              {...register("newPassword", {
                required: "Required",
                validate: (v) => POLICY.test(v) || "At least 8 characters with upper case, lower case and a number",
              })}
            />
          </Field>
          <Field label="New password again" htmlFor="cp-confirm" error={errors.confirm?.message}>
            <TextInput
              id="cp-confirm"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              {...register("confirm", { validate: (v) => v === watch("newPassword") || "The passwords do not match" })}
            />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            {forced ? (
              <Button variant="ghost" icon={LogOut} onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>
                Sign out
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            )}
            <span className="flex-1" />
            <Button type="submit" icon={KeyRound} loading={saving}>
              {forced ? "Save and continue" : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
