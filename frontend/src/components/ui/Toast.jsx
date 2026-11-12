import React, { useEffect, useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/cn";
import Dialog from "./Dialog";
import { Button } from "./Button";
import { subscribe, getToasts, getPendingConfirm, dismissToast, closeConfirm } from "./toastStore";

/*
 * Toasts and confirm dialogs, callable from anywhere (no hook needed):
 *
 *   toast.success("Saved");
 *   toast.error(err.response?.data?.message || "Could not save");
 *   if (await confirmDialog({ title: "Delete exam?", tone: "danger" })) …
 *
 * <Toaster /> is mounted once in App.jsx.
 */

// ---- UI -------------------------------------------------------------------
const TONES = {
  success: ["text-emerald-600", CheckCircle2],
  error: ["text-red-600", AlertCircle],
  warning: ["text-amber-500", TriangleAlert],
  info: ["text-sky-600", Info],
};

const ToastItem = ({ t }) => {
  const [color, Icon] = TONES[t.tone] || TONES.info;
  useEffect(() => {
    if (!t.duration) return undefined;
    const timer = setTimeout(() => dismissToast(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.at, t.duration]);

  return (
    <div
      role={t.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full animate-pop-in items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 pr-2.5 text-sm shadow-pop sm:w-96"
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", color)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {t.title && <p className="font-semibold text-slate-900">{t.title}</p>}
        <p className={cn("break-words text-slate-600", !t.title && "text-slate-800")}>{t.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        aria-label="Dismiss"
        className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

const ConfirmHost = () => {
  const pending = useSyncExternalStore(subscribe, getPendingConfirm);
  if (!pending) return null;
  const danger = pending.tone === "danger";

  return (
    <Dialog
      open
      size="sm"
      title={pending.title || "Are you sure?"}
      onClose={() => closeConfirm(false)}
      footer={
        <>
          <Button variant="secondary" onClick={() => closeConfirm(false)}>
            {pending.cancelLabel || "Cancel"}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            data-autofocus
            onClick={() => closeConfirm(true)}
          >
            {pending.confirmLabel || (danger ? "Delete" : "Confirm")}
          </Button>
        </>
      }
    >
      {pending.message && <p className="text-sm whitespace-pre-line text-slate-600">{pending.message}</p>}
    </Dialog>
  );
};

/** Mount once near the root. */
export const Toaster = () => {
  const list = useSyncExternalStore(subscribe, getToasts);
  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6 print:hidden"
      >
        {list.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </div>
      <ConfirmHost />
    </>
  );
};

export default Toaster;
