import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, CalendarCheck, NotebookPen, Users, ChevronRight, Star, Library, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/common/StatCard";
import NoticesFeed from "../../components/common/NoticesFeed";
import { teacherService } from "../../api/teacherService";
import { examService } from "../../api/examService";
import { Badge, Card, CardHeader, EmptyState, Skeleton } from "../../components/ui";
import { formatDate } from "../../utils/format";

const QUICK_ACTIONS = [
  { to: "/teacher/attendance", label: "Take attendance", hint: "Today's register", icon: CalendarCheck },
  { to: "/teacher/marks", label: "Enter marks", hint: "Published exams", icon: ClipboardList },
  { to: "/teacher/assignments", label: "Assignments", hint: "Set and grade work", icon: NotebookPen },
  { to: "/teacher/students", label: "My students", hint: "Class lists", icon: Users },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [openExams, setOpenExams] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([teacherService.getTeacherAssignments({ userId: user?.id }), examService.getExamsForMarksEntry()]).then(([a, e]) => {
      if (a.status === "fulfilled") setAssignments(a.value.data || []);
      if (e.status === "fulfilled") setOpenExams((e.value.data || []).filter((x) => x.status === "PUBLISHED"));
      setLoading(false);
    });
  }, [user?.id]);

  // One card per class-section, listing the subjects taught there.
  const classes = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const key = `${a.classSubject?.classId}-${a.sectionId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: `${a.classSubject?.class?.name || "Class"} ${a.section?.name || ""}`.trim(),
          gradeLevel: a.classSubject?.class?.gradeLevel ?? 0,
          subjects: [],
          isClassTeacher: false,
        });
      }
      const c = map.get(key);
      if (a.classSubject?.subject?.name) c.subjects.push(a.classSubject.subject.name);
      if (a.isClassTeacher) c.isClassTeacher = true;
    });
    return [...map.values()].sort((x, y) => x.gradeLevel - y.gradeLevel || x.name.localeCompare(y.name));
  }, [assignments]);

  const subjectCount = new Set(assignments.map((a) => a.classSubject?.subject?.name).filter(Boolean)).size;
  const classTeacherOf = classes.filter((c) => c.isClassTeacher).map((c) => c.name);
  const v = (n) => (loading ? "…" : n);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {greeting()}, {user?.firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your classes, marks and notices in one place.</p>
        </div>
        {classTeacherOf.length > 0 && (
          <Badge tone="brand" icon={Star} className="px-3 py-1 text-sm">
            Class teacher · {classTeacherOf.join(", ")}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Class sections" value={v(classes.length)} icon={BookOpen} color="primary" hint="Where you teach a subject" />
        <StatCard title="Subjects" value={v(subjectCount)} icon={Library} color="success" hint="Across all classes" />
        <StatCard title="Teaching slots" value={v(assignments.length)} icon={Users} color="info" hint="Subject × section" />
        <StatCard
          title="Exams open for marks"
          value={v(openExams?.length ?? "—")}
          icon={ClipboardList}
          color="warning"
          hint={openExams?.length ? openExams.map((e) => e.name).slice(0, 2).join(", ") : "None published right now"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="My classes"
            description="Take the register or enter marks straight from here."
            actions={
              <Link to="/teacher/students" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                Students
              </Link>
            }
          />
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState icon={BookOpen} title="No classes yet" description="Ask the school admin to assign you to a class and subject for this year." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => (
                <div key={c.key} className="flex flex-col rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-200">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{c.name}</h3>
                    {c.isClassTeacher && <Badge tone="brand">Class teacher</Badge>}
                  </div>
                  <div className="mt-2 flex flex-1 flex-wrap content-start gap-1.5">
                    {c.subjects.map((s) => (
                      <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-sm">
                    <Link to={`/teacher/attendance?class=${c.key}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800">
                      <CalendarCheck size={15} aria-hidden="true" /> Attendance
                    </Link>
                    <Link to="/teacher/marks" className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900">
                      <ClipboardList size={15} aria-hidden="true" /> Marks
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
                  <a.icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{a.label}</span>
                  <span className="block truncate text-xs text-slate-500">{a.hint}</span>
                </span>
                <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Notices"
          actions={
            <Link to="/teacher/notices" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <NoticesFeed limit={4} showViewAll={false} compact />
      </Card>
    </div>
  );
};

export default TeacherDashboard;
