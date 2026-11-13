import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { buttonClasses } from "../ui";
import { cn } from "../../lib/cn";
import { NAV_LINKS } from "../../pages/public/content";
import ProductLogo from "./ProductLogo";

/**
 * Top bar of the public site. Transparent over the page top, white and blurred once
 * the page scrolls. The active link gets a sliding underline. On phones the links move
 * into a panel under a menu button.
 */
const PublicNavbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(location.pathname);

  // Close the phone menu when the route changes (state reset during render, not in an effect).
  if (openedAt !== location.pathname) {
    setOpenedAt(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const action = user
    ? { to: "/dashboard", label: "Go to dashboard", icon: LayoutDashboard }
    : { to: "/login", label: "Sign in", icon: LogIn };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open ? "border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600" aria-label="Vidyalaya SMS home">
          <ProductLogo />
        </Link>

        <nav aria-label="Site" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      "relative block rounded-lg px-3.5 py-2 text-sm font-medium no-underline transition-colors",
                      isActive ? "text-brand-700" : "text-slate-600 hover:text-slate-900",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <Motion.span
                          layoutId="public-nav-underline"
                          className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link to={action.to} className={cn(buttonClasses({ size: "md" }), "group hidden no-underline sm:inline-flex")}>
            <action.icon size={16} aria-hidden="true" />
            {action.label}
            <ArrowRight size={15} className="-ml-0.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600 md:hidden"
            aria-expanded={open}
            aria-controls="public-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <Motion.nav
            id="public-mobile-menu"
            aria-label="Site"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-slate-200/80 md:hidden"
          >
            <ul className="space-y-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-lg px-3 py-2.5 text-base font-medium no-underline",
                        isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2">
                <Link to={action.to} className={cn(buttonClasses({ size: "lg" }), "w-full no-underline")}>
                  <action.icon size={18} aria-hidden="true" />
                  {action.label}
                </Link>
              </li>
            </ul>
          </Motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default PublicNavbar;
