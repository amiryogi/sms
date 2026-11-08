import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Building2,
  CalendarRange,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Facebook,
  Instagram,
  LogOut,
  Menu as MenuIcon,
  X,
  Youtube,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PermissionNotice from "../components/common/PermissionNotice";
import { Avatar, Menu, MenuItem, MenuLabel, MenuSeparator } from "../components/ui";
import { academicService } from "../api/academicService";
import { resolveAssetUrl } from "../utils/assets";
import { cn } from "../lib/cn";
import { getNavSections, titleForPath, formatRoleName } from "./navigation";

const COLLAPSE_KEY = "sms.sidebarCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const SchoolMark = ({ school, size = "md" }) => {
  const [failed, setFailed] = useState(false);
  const logo = school?.logoUrl ? resolveAssetUrl(school.logoUrl) : null;
  const box = size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-xl";
  if (logo && !failed) {
    return <img src={logo} alt="" className={cn(box, "shrink-0 bg-white object-contain ring-1 ring-slate-200")} onError={() => setFailed(true)} />;
  }
  return (
    <span className={cn(box, "flex shrink-0 items-center justify-center bg-brand-600 text-brand-fg")}>
      <Building2 size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </span>
  );
};

/** The navigation list, shared by the desktop sidebar and the mobile drawer. */
const SidebarNav = ({ sections, collapsed, onNavigate }) => {
  const navRef = useRef(null);
  const { pathname } = useLocation();

  // Keep the active item in view: on a short screen, Notices or Settings sit
  // below the fold. Scrolls only the nav, never the page.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector('[aria-current="page"]');
    if (!link) return;
    const n = nav.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    if (r.top < n.top || r.bottom > n.bottom) nav.scrollTop += r.top - n.top - (n.height - r.height) / 2;
  }, [pathname, collapsed]);

  return (
  <nav ref={navRef} className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
    {sections.map((section) => (
      <div key={section.label} className="mb-5 last:mb-0">
        {!collapsed && (
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{section.label}</p>
        )}
        <ul className="space-y-0.5">
          {section.items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                title={collapsed ? item.title : undefined}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      aria-hidden="true"
                      className={cn("shrink-0", isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
  );
};

const DashboardLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState(null);

  const sections = useMemo(() => getNavSections(hasRole), [hasRole]);
  const { title, section } = titleForPath(location.pathname);
  const school = user?.school;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const roleLabel = (user?.roles || []).map(formatRoleName).join(", ");

  useEffect(() => {
    document.title = `${title} · ${school?.name || "School Management"}`;
  }, [title, school?.name]);

  // Close the mobile drawer whenever the page changes (state reset during
  // render, the React-recommended alternative to an effect).
  const [drawerPath, setDrawerPath] = useState(location.pathname);
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    let alive = true;
    academicService
      .getCurrentAcademicYear()
      .then((res) => alive && setAcademicYear(res?.data || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable: keep it in memory */
      }
      return !c;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const socials = [
    school?.facebookUrl && { href: school.facebookUrl, label: "Facebook", icon: Facebook },
    school?.instagramUrl && { href: school.instagramUrl, label: "Instagram", icon: Instagram },
    school?.youtubeUrl && { href: school.youtubeUrl, label: "YouTube", icon: Youtube },
  ].filter(Boolean);

  const brandBlock = (isCollapsed) => (
    <Link
      to="/dashboard"
      className={cn("flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-600", isCollapsed && "justify-center")}
    >
      <SchoolMark school={school} />
      {!isCollapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">{school?.name || "School Management"}</span>
          {school?.tagline ? (
            <span className="block truncate text-xs text-slate-500">{school.tagline}</span>
          ) : (
            <span className="block truncate text-xs text-slate-500">School management</span>
          )}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-dvh bg-slate-50 print:bg-white">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex print:hidden",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-slate-100 px-4", collapsed && "justify-center px-0")}>
          {brandBlock(collapsed)}
        </div>
        <SidebarNav sections={sections} collapsed={collapsed} />
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={16} aria-hidden="true" /> : <ChevronsLeft size={16} aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative flex h-full w-72 max-w-[85vw] animate-slide-in flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-100 px-4">
              {brandBlock(false)}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <SidebarNav sections={sections} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <PermissionNotice />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon size={20} aria-hidden="true" />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              {section && (
                <>
                  <li className="hidden truncate text-slate-500 sm:block">{section}</li>
                  <li className="hidden text-slate-300 sm:block" aria-hidden="true">
                    <ChevronRight size={14} />
                  </li>
                </>
              )}
              <li className="truncate font-medium text-slate-900" aria-current="page">{title}</li>
            </ol>
          </nav>

          {academicYear?.name && (
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 md:inline-flex">
              <CalendarRange size={13} aria-hidden="true" />
              {academicYear.name}
            </span>
          )}

          <Menu
            trigger={({ toggle, ...aria }) => (
              <button
                type="button"
                onClick={toggle}
                {...aria}
                className="flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <Avatar src={user?.avatarUrl} name={fullName} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-40 truncate text-sm leading-tight font-medium text-slate-800">{fullName}</span>
                  <span className="block max-w-40 truncate text-xs leading-tight text-slate-500">{roleLabel}</span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" aria-hidden="true" />
              </button>
            )}
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <p className="mt-1 truncate text-xs font-medium text-brand-700">{roleLabel}</p>
            </div>
            {socials.length > 0 && (
              <>
                <MenuSeparator />
                <MenuLabel>{school?.name}</MenuLabel>
                {socials.map((s) => (
                  <MenuItem key={s.label} icon={s.icon} href={s.href}>
                    {s.label}
                  </MenuItem>
                ))}
              </>
            )}
            <MenuSeparator />
            <MenuItem icon={LogOut} danger onClick={handleLogout}>
              Sign out
            </MenuItem>
          </Menu>
        </header>

        {/* Page */}
        <main className="page-content flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
