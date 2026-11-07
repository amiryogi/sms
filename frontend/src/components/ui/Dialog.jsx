import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-6xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Accessible dialog: portalled to <body>, Esc closes, focus is trapped inside
 * and returned afterwards, body scroll is locked. Full-screen sheet on phones.
 * Backdrop clicks do NOT close it (forms would lose their input).
 */
const Dialog = ({ open, onClose, title, description, size = "md", footer, children, className, hideClose = false }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    openCount += 1;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    panel?.addEventListener("keydown", onKey);

    return () => {
      panel?.removeEventListener("keydown", onKey);
      openCount -= 1;
      if (openCount <= 0) document.body.style.overflow = "";
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-dvh w-full animate-pop-in flex-col bg-white shadow-pop outline-none",
          "rounded-t-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl",
          SIZES[size] || SIZES.md,
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>}
              {description && <p id={descId} className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

/**
 * Button row for the end of a form rendered inside a Dialog body: bleeds to
 * the dialog edges and matches the dialog footer look.
 */
export const DialogActions = ({ children, className }) => (
  <div
    className={cn(
      "-mx-5 mt-6 -mb-5 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6",
      className,
    )}
  >
    {children}
  </div>
);

export default Dialog;
