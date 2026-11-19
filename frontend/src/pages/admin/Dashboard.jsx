import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  GraduationCap,
  BookOpen,
  Library,
  CalendarRange,
  UserCog,
  ClipboardList,
  Award,
  Megaphone,
  Wallet,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, Avatar, Badge, Skeleton, PageShell, StatCard, EmptyState, buttonClasses } from "../../components/ui";
import DashboardGreeting from "../../components/common/DashboardGreeting";
import { studentService } from "../../api/studentService";
import { teacherService } from "../../api/teacherService";
import { academicService } from "../../api/academicService";
import { formatDate, fullName } from "../../utils/format";

const extractList = (res, key) => res?.data?.[key] || res?.data || res?.[key] || res || [];

const QUICK_ACTIONS = [
  { to: "/admin/students", label: "Students", hint: "Add, enrol, edit", icon: GraduationCap },
  { to: "/admin/exams", label: "Exams", hint: "Create and publish", icon: ClipboardList },
  { to: "/admin/report-cards", label: "Report cards", hint: "Generate and print", icon: Award },
  { to: "/admin/teacher-assignment", label: "Teacher assignment", hint: "Who teaches what", icon: UserCog },
  // /admin/fee-payments only redirected here since the fee ledger replaced that page.
  { to: "/finance/accounts", label: "Student accounts", hint: "Fees, payments, receipts", icon: Wallet },
  { to: "/admin/notices", label: "Notices", hint: "Post an announcement", icon: Megaphone },
];

const PersonRow = ({ person, role }) => {
  const name = fullName(person);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar src={person.avatarUrl} name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{person.email}</p>
      </div>
      {role}
    </li>
  );
};

const ListSkeleton = () => (
  <ul className="divide-y divide-slate-100">
    {Array.from({ length: 4 }, (_, i) => (
      <li key={i} className="flex items-center gap-3 py-2.5">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </li>
    ))}
  </ul>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, subjects: 0 });
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, subjectsRes, yearRes] = await Promise.allSettled([
        studentService.getStudents({ limit: 5, sort: "createdAt:desc" }),
        teacherService.getTeachers({ limit: 5, sort: "createdAt:desc" }),
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getCurrentAcademicYear(),
      ]).then((all) => all.map((r) => (r.status === "fulfilled" ? r.value : null)));

      const studentList = extractList(studentsRes, "students");
      const teacherList = extractList(teachersRes, "teachers");

      setStats({
        students: studentsRes?.pagination?.total ?? studentsRes?.data?.pagination?.total ?? studentList.length ?? 0,
        teachers: teachersRes?.pagination?.total ?? teachersRes?.data?.pagination?.total ?? teacherList.length ?? 0,
        classes: classesRes?.data?.length || 0,
        subjects: subjectsRes?.data?.length || 0,
      });
      setRecentStudents(Array.isArray(studentList) ? studentList.slice(0, 5) : []);
      setRecentTeachers(Array.isArray(teacherList) ? teacherList.slice(0, 5) : []);
      setCurrentYear(yearRes?.data || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <DashboardGreeting
        subtitle={`Here's what's happening at ${user?.school?.name || "your school"}.`}
        aside={
          currentYear ? (
            <Badge icon={CalendarRange} className="px-3 py-1 text-sm">
              Academic year {currentYear.name}
            </Badge>
          ) : (
            !loading && (
              // No current year is a state that needs action, so it carries warn.
              <Link to="/admin/academic-years" className="text-sm font-medium text-warn hover:underline">
                No current academic year. Set one up
              </Link>
            )
          )
        }
      />

      {/* Stats: neutral counts, so ink — none of these is a status. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={stats.students} loading={loading} icon={GraduationCap} sub="Enrolled this year" to="/admin/students" />
        <StatCard label="Teachers & staff" value={stats.teachers} loading={loading} icon={UsersRound} sub="Active accounts" to="/admin/teachers" />
        <StatCard label="Classes" value={stats.classes} loading={loading} icon={BookOpen} sub="Grades offered" to="/admin/classes" />
        <StatCard label="Subjects" value={stats.subjects} loading={loading} icon={Library} sub="In the master list" to="/admin/subjects" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-2">
          <CardHeader title="Quick actions" description="Jump straight to the work you do most." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <a.icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{a.label}</span>
                  <span className="block truncate text-xs text-slate-500">{a.hint}</span>
                </span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Card>

        {/* School summary */}
        <Card>
          <CardHeader title="School" />
          <dl className="space-y-3 text-sm">
            {[
              ["Name", user?.school?.name || "—"],
              ["Academic year", currentYear?.name || "Not set"],
              ["Year runs", currentYear ? `${formatDate(currentYear.startDate)} – ${formatDate(currentYear.endDate)}` : "—"],
              ["Signed in as", (user?.roles || []).map((r) => r.replace("_", " ").toLowerCase()).join(", ")],
            ].map(([k, val]) => (
              <div key={k} className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-900 capitalize">{val}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/admin/school-settings"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            School settings <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent students"
            actions={<Link to="/admin/students" className="text-sm font-medium text-brand-700 hover:text-brand-800">View all</Link>}
          />
          {loading ? (
            <ListSkeleton />
          ) : recentStudents.length ? (
            <ul className="divide-y divide-slate-100">
              {recentStudents.map((s) => (
                <PersonRow
                  key={s.id}
                  person={s}
                  role={s.class ? <Badge>{s.class} {s.section}</Badge> : <Badge tone="warning">Not enrolled</Badge>}
                />
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={GraduationCap} title="No students yet" description="Add a student to create their login and enrol them in a class." action={<Link to="/admin/students" className={buttonClasses({ variant: "secondary", size: "sm" })}>Add student</Link>} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Teachers & staff"
            actions={<Link to="/admin/teachers" className="text-sm font-medium text-brand-700 hover:text-brand-800">View all</Link>}
          />
          {loading ? (
            <ListSkeleton />
          ) : recentTeachers.length ? (
            <ul className="divide-y divide-slate-100">
              {recentTeachers.map((t) => (
                <PersonRow
                  key={t.id}
                  person={t}
                  role={
                    <Badge>
                      {(t.roles || []).includes("EXAM_OFFICER")
                        ? "Exam officer"
                        : (t.roles || []).includes("ACCOUNTANT")
                          ? "Accountant"
                          : "Teacher"}
                    </Badge>
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={UsersRound} title="No staff yet" description="Add teachers and staff so you can assign them to classes." action={<Link to="/admin/teachers" className={buttonClasses({ variant: "secondary", size: "sm" })}>Add staff member</Link>} />
          )}
        </Card>
      </div>
    </PageShell>
  );
};

export default AdminDashboard;
