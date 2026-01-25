import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Lazy loading for better performance
const Login = React.lazy(() => import("./pages/Login"));

// Admin Pages
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const AcademicYears = React.lazy(() => import("./pages/admin/AcademicYears"));
const Classes = React.lazy(() => import("./pages/admin/Classes"));
const Sections = React.lazy(() => import("./pages/admin/Sections"));
const Subjects = React.lazy(() => import("./pages/admin/Subjects"));
const ClassSubjects = React.lazy(() => import("./pages/admin/ClassSubjects"));
const Exams = React.lazy(() => import("./pages/admin/Exams"));
const NEBCurriculum = React.lazy(() => import("./pages/admin/NEBCurriculum"));
const Programs = React.lazy(() => import("./pages/admin/Programs"));
const TeacherAssignment = React.lazy(
  () => import("./pages/admin/TeacherAssignment"),
);
const AdminParents = React.lazy(() => import("./pages/admin/Parents"));
const AdminStudents = React.lazy(() => import("./pages/admin/Students"));
const AdminTeachers = React.lazy(() => import("./pages/admin/Teachers"));
const AdminReportCards = React.lazy(() => import("./pages/admin/ReportCards"));
const AdminNotices = React.lazy(() => import("./pages/admin/Notices"));
const SchoolSettings = React.lazy(() => import("./pages/admin/SchoolSettings"));
const AdminFeeTypes = React.lazy(() => import("./pages/admin/FeeTypes"));
const AdminFeeStructures = React.lazy(
  () => import("./pages/admin/FeeStructures"),
);
const AdminFeePayments = React.lazy(() => import("./pages/admin/FeePayments"));
const AdminPromotions = React.lazy(() => import("./pages/admin/Promotions"));

// Teacher Pages
const TeacherDashboard = React.lazy(() => import("./pages/teacher/Dashboard"));
const TeacherAttendance = React.lazy(
  () => import("./pages/teacher/Attendance"),
);
const TeacherAssignments = React.lazy(
  () => import("./pages/teacher/Assignments"),
);
const MarksEntry = React.lazy(() => import("./pages/teacher/MarksEntry"));
const MyStudents = React.lazy(() => import("./pages/teacher/MyStudents"));

// Student Pages
const StudentDashboard = React.lazy(() => import("./pages/student/Dashboard"));
const StudentAssignments = React.lazy(
  () => import("./pages/student/Assignments"),
);
const StudentResults = React.lazy(() => import("./pages/student/Results"));
const StudentReportCard = React.lazy(
  () => import("./pages/student/ReportCard"),
);
const StudentFees = React.lazy(() => import("./pages/student/Fees"));

// Parent Pages
const ParentDashboard = React.lazy(() => import("./pages/parent/Dashboard"));
const ParentAttendance = React.lazy(() => import("./pages/parent/Attendance"));
const ParentResults = React.lazy(() => import("./pages/parent/Results"));
const ParentReportCard = React.lazy(() => import("./pages/parent/ReportCard"));
const ParentFees = React.lazy(() => import("./pages/parent/Fees"));

// Shared Pages
const NoticesView = React.lazy(() => import("./pages/shared/NoticesView"));

// Error Pages
const NotFound = () => (
  <div className="card error-page">
    <h1>404 - Page Not Found</h1>
  </div>
);
const Unauthorized = () => (
  <div className="card error-page">
    <h1>401 - Unauthorized Access</h1>
  </div>
);

// Loading Component
const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="loader"></div>
    <p>Loading...</p>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/academic-years" element={<AcademicYears />} />
              <Route path="/admin/classes" element={<Classes />} />
              <Route path="/admin/sections" element={<Sections />} />
              <Route path="/admin/subjects" element={<Subjects />} />
              <Route path="/admin/class-subjects" element={<ClassSubjects />} />
              <Route path="/admin/exams" element={<Exams />} />
              <Route path="/admin/neb-curriculum" element={<NEBCurriculum />} />
              <Route path="/admin/programs" element={<Programs />} />
              <Route
                path="/admin/teacher-assignment"
                element={<TeacherAssignment />}
              />
              <Route path="/admin/parents" element={<AdminParents />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route
                path="/admin/report-cards"
                element={<AdminReportCards />}
              />
              <Route path="/admin/notices" element={<AdminNotices />} />
              <Route
                path="/admin/school-settings"
                element={<SchoolSettings />}
              />
              <Route path="/admin/fee-types" element={<AdminFeeTypes />} />
              <Route
                path="/admin/fee-structures"
                element={<AdminFeeStructures />}
              />
              <Route
                path="/admin/fee-payments"
                element={<AdminFeePayments />}
              />
              <Route
                path="/admin/promotions"
                element={<AdminPromotions />}
              />
            </Route>

            {/* Teacher Routes */}
            <Route
              element={
                <ProtectedRoute roles={["TEACHER", "EXAM_OFFICER", "ADMIN"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/notices" element={<NoticesView />} />
              <Route
                path="/teacher/attendance"
                element={<TeacherAttendance />}
              />
              <Route
                path="/teacher/assignments"
                element={<TeacherAssignments />}
              />
              <Route path="/teacher/marks" element={<MarksEntry />} />
              <Route path="/teacher/students" element={<MyStudents />} />
            </Route>

            {/* Student Routes */}
            <Route
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/notices" element={<NoticesView />} />
              <Route
                path="/student/assignments"
                element={<StudentAssignments />}
              />
              <Route path="/student/results" element={<StudentResults />} />
              <Route
                path="/student/report-card"
                element={<StudentReportCard />}
              />
              <Route path="/student/fees" element={<StudentFees />} />
            </Route>

            {/* Parent Routes */}
            <Route
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/parent/notices" element={<NoticesView />} />
              <Route path="/parent/attendance" element={<ParentAttendance />} />
              <Route path="/parent/results" element={<ParentResults />} />
              <Route
                path="/parent/report-card"
                element={<ParentReportCard />}
              />
              <Route path="/parent/fees" element={<ParentFees />} />
            </Route>

            {/* Accountant Routes */}
            <Route
              element={
                <ProtectedRoute roles={["ACCOUNTANT", "ADMIN"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/accountant/dashboard"
                element={<AdminFeePayments />}
              />
              <Route path="/accountant/fee-types" element={<AdminFeeTypes />} />
              <Route
                path="/accountant/fee-structures"
                element={<AdminFeeStructures />}
              />
              <Route
                path="/accountant/fee-payments"
                element={<AdminFeePayments />}
              />
              <Route path="/accountant/notices" element={<NoticesView />} />
            </Route>

            {/* Dashboard Redirect Logic */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<RoleBasedDashboard />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Error Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </Router>
  );
}

// Role-based dashboard redirect
function RoleBasedDashboard() {
  const { user } = useAuth();

  // Safety check - redirect to unauthorized if no user or no roles
  if (!user || !user.roles || user.roles.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.roles.includes("ADMIN")) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.roles.includes("ACCOUNTANT")) {
    return <Navigate to="/accountant/dashboard" replace />;
  }
  if (user.roles.includes("EXAM_OFFICER")) {
    return <Navigate to="/teacher/marks" replace />;
  }
  if (user.roles.includes("TEACHER")) {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  if (user.roles.includes("STUDENT")) {
    return <Navigate to="/student/dashboard" replace />;
  }
  if (user.roles.includes("PARENT")) {
    return <Navigate to="/parent/dashboard" replace />;
  }

  // Fallback for unknown roles - redirect to unauthorized
  return <Navigate to="/unauthorized" replace />;
}

export default App;
