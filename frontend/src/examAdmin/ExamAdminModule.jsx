import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route, Navigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/ui";
import { cn } from "../lib/cn";
import dataProvider from "./dataProvider";
import buildAuthProvider from "./authProvider";
import buildTheme from "./theme";
import { ExamList, ExamShow, ResultList } from "./ExamScreens";

export const BASENAME = "/admin/exam-admin";

const TABS = [
  { to: `${BASENAME}/exams`, label: "Examinations" },
  { to: `${BASENAME}/results`, label: "Results" },
];

/**
 * React-admin's own layout (app bar + sidebar) is replaced by this bare one:
 * the app's DashboardLayout already provides the shell, so the pilot only adds
 * a page header and two tabs in the app's own style.
 */
const BareLayout = ({ children }) => (
  <div className="mx-auto max-w-7xl">
    <PageHeader
      icon={ClipboardList}
      title="Exam administration"
      description="Pilot: examinations and results as sortable, filterable tables. Creating exams, entering marks and printing stay on their own pages."
    />
    <nav aria-label="Exam administration" className="mb-4 flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
    {children}
  </div>
);

/**
 * The examination pilot: React-admin mounted inside the existing router at
 * /admin/exam-admin/*, lazy-loaded so its Material UI code is only fetched
 * here. See docs/react-admin/examination-integration-plan.md.
 */
const ExamAdminModule = () => {
  const { user, logout } = useAuth();
  const authProvider = useMemo(() => buildAuthProvider({ user, logout }), [user, logout]);
  const theme = useMemo(() => buildTheme(), []);

  return (
    <Admin
      basename={BASENAME}
      dataProvider={dataProvider}
      authProvider={authProvider}
      layout={BareLayout}
      theme={theme}
      darkTheme={null}
      loginPage={false}
      disableTelemetry
      title="Exam administration"
    >
      <Resource name="exams" list={ExamList} show={ExamShow} recordRepresentation="name" />
      <Resource name="results" list={ResultList} />
      <Resource name="academic-years" />
      <Resource name="classes" />
      <Resource name="sections" />
      <CustomRoutes>
        <Route path="/" element={<Navigate to="exams" replace />} />
      </CustomRoutes>
    </Admin>
  );
};

export default ExamAdminModule;
