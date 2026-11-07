import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

/**
 * Small dropdown menu. `trigger` is a render function receiving
 * { open, toggle, ref-able props }; `children` are <MenuItem>s.
 */
export const Menu = ({ trigger, align = "end", children, className }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-40 mt-2 min-w-56 animate-pop-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-pop)]",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const MenuItem = ({ icon: Icon, children, onClick, href, danger, as: Tag, ...props }) => {
  const classes = cn(
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
    danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  );
  const content = (
    <>
      {Icon && <Icon size={16} className={danger ? "" : "text-slate-400"} aria-hidden="true" />}
      {children}
    </>
  );
  if (href) {
    return (
      <a role="menuitem" href={href} target="_blank" rel="noreferrer" className={classes} {...props}>
        {content}
      </a>
    );
  }
  const Comp = Tag || "button";
  return (
    <Comp role="menuitem" type={Comp === "button" ? "button" : undefined} onClick={onClick} className={classes} {...props}>
      {content}
    </Comp>
  );
};

export const MenuLabel = ({ children }) => (
  <div className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-slate-400">{children}</div>
);

export const MenuSeparator = () => <div className="my-1.5 h-px bg-slate-100" role="separator" />;
