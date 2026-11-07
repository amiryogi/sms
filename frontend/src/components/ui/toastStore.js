/*
 * Toasts and confirm dialogs, callable from anywhere (no hook needed):
 *   toast.success("Saved");
 *   if (await confirmDialog({ title: "Delete exam?", tone: "danger" })) …
 * <Toaster /> (Toast.jsx) renders them; it is mounted once in App.jsx.
 */

// ---- tiny store -----------------------------------------------------------
let toasts = [];
let pendingConfirm = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
let seq = 0;

const DURATION = { success: 3500, info: 4000, warning: 5000, error: 6000 };

const push = (tone, message, { id, title, duration } = {}) => {
  const key = id || `t${++seq}`;
  toasts = [...toasts.filter((t) => t.id !== key), { id: key, tone, message, title, duration: duration ?? DURATION[tone], at: Date.now() }];
  emit();
  return key;
};

export const dismissToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

export const toast = {
  success: (message, opts) => push("success", message, opts),
  error: (message, opts) => push("error", message, opts),
  info: (message, opts) => push("info", message, opts),
  warning: (message, opts) => push("warning", message, opts),
};

/**
 * Promise-based confirmation. Resolves true (confirmed) or false.
 * { title, message, confirmLabel, cancelLabel, tone: "danger" | "primary" }
 */
export const confirmDialog = (options = {}) =>
  new Promise((resolve) => {
    pendingConfirm?.resolve(false);
    pendingConfirm = { ...options, resolve };
    emit();
  });

export const closeConfirm = (result) => {
  pendingConfirm?.resolve(result);
  pendingConfirm = null;
  emit();
};

export const getToasts = () => toasts;
export const getPendingConfirm = () => pendingConfirm;
