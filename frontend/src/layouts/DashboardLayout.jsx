import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  GraduationCap,
  ClipboardList,
  BookOpenCheck,
  Award,
  FolderOpen,
  FileText,
  Bell,
  Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url
    .replace(/^\\?/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/")}`;
};

const DashboardLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Role-based navigation items
  const getNavItems = () => {
    const items = [];

    if (hasRole("ADMIN")) {
      items.push(
        { title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
        {
          title: "Academic Years",
          icon: Calendar,
          path: "/admin/academic-years",
        },
        { title: "Classes", icon: BookOpen, path: "/admin/classes" },
        { title: "Sections", icon: FolderOpen, path: "/admin/sections" },
        { title: "Subjects", icon: FileText, path: "/admin/subjects" },
        {
          title: "Class Subjects",
          icon: BookOpenCheck,
          path: "/admin/class-subjects",
        },
        { title: "Exams", icon: ClipboardList, path: "/admin/exams" },
        { title: "Report Cards", icon: Award, path: "/admin/report-cards" },
        {
          title: "Teacher Assignment",
          icon: Award,
          path: "/admin/teacher-assignment",
        },
        { title: "Parents", icon: Users, path: "/admin/parents" },
        { title: "Students", icon: GraduationCap, path: "/admin/students" },
        { title: "Teachers", icon: Users, path: "/admin/teachers" },
        { title: "Notices", icon: Bell, path: "/admin/notices" },
        { title: "Fee Types", icon: Banknote, path: "/admin/fee-types" },
        {
          title: "Fee Structures",
          icon: Banknote,
          path: "/admin/fee-structures",
        },
        { title: "Fee Payments", icon: Banknote, path: "/admin/fee-payments" }
      );
    }

    if (hasRole("TEACHER")) {
      items.push(
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/teacher/dashboard",
        },
        {
          title: "Notices",
          icon: Bell,
          path: "/teacher/notices",
        },
        {
          title: "My Students",
          icon: GraduationCap,
          path: "/teacher/students",
        },
        {
          title: "Attendance",
          icon: ClipboardList,
          path: "/teacher/attendance",
        },
        { title: "Assignments", icon: Calendar, path: "/teacher/assignments" },
        { title: "Marks Entry", icon: BookOpenCheck, path: "/teacher/marks" }
      );
    }

    if (hasRole("STUDENT")) {
      items.push(
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/student/dashboard",
        },
        {
          title: "Notices",
          icon: Bell,
          path: "/student/notices",
        },
        { title: "Assignments", icon: Calendar, path: "/student/assignments" },
        { title: "Results", icon: Award, path: "/student/results" },
        { title: "Report Card", icon: FileText, path: "/student/report-card" },
        { title: "Fees", icon: Banknote, path: "/student/fees" }
      );
    }

    if (hasRole("PARENT")) {
      items.push(
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/parent/dashboard",
        },
        {
          title: "Notices",
          icon: Bell,
          path: "/parent/notices",
        },
        {
          title: "Attendance",
          icon: ClipboardList,
          path: "/parent/attendance",
        },
        { title: "Results", icon: Award, path: "/parent/results" },
        { title: "Fees", icon: Banknote, path: "/parent/fees" }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const avatarSrc = resolveAssetUrl(user?.avatarUrl);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${sidebarOpen ? "open" : "closed"}`}
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
      >
        <div className="sidebar-header">
          {sidebarOpen ? (
            <span className="logo-text">K-12 SMS</span>
          ) : (
            <LayoutDashboard size={24} />
          )}
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon className="nav-icon" size={20} />
              {sidebarOpen && <span className="nav-text">{item.title}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="user-avatar" />
            ) : (
              <UserCircle size={24} className="user-avatar" />
            )}
            {sidebarOpen && (
              <div className="user-info">
                <span className="user-name">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="user-role">{user?.roles?.[0]}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-top-bar">
          <div className="breadcrumb">
            Dashboard / {location.pathname.split("/").pop() || "Overview"}
          </div>
          <div className="top-bar-actions">
            <div className="school-pill">
              {user?.school?.name || "School Management System"}
            </div>
          </div>
        </header>

        <div className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
