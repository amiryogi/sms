import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

/**
 * Small dropdown menu. `trigger` is a render function receiving
 * { open, toggle, "aria-expanded", "aria-haspopup" }; `children` are
 * <MenuItem>s. The panel is portalled to <body> with fixed positioning, so
 * tables and cards with overflow:hidden never clip it.
 */
export const Menu = ({ trigger, align = "end", children, className }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const place = () => {
      const r = rootRef.current.getBoundingClientRect();
      const panelH = panelRef.current?.offsetHeight || 0;
      const below = r.bottom + 8;
      const flip = panelH && below + panelH > window.innerHeight - 8 && r.top - 8 - panelH > 8;
      setPos({
        top: flip ? r.top - 8 - panelH : below,
        ...(align === "end" ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) }),
      });
    };
    place();
    // Second pass once the panel has a height (for flipping above).
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, align]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            onClick={() => setOpen(false)}
            style={{ position: "fixed", ...(pos || { top: -9999, left: -9999 }) }}
            className={cn(
              "z-[70] min-w-56 animate-pop-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop",
              className,
            )}
          >
            {children}
          </div>,
          document.body,
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
