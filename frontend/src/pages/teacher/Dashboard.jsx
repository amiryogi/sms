import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, CalendarCheck, NotebookPen, Users, ChevronRight, Star, Library, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NoticesFeed from "../../components/common/NoticesFeed";
import { teacherService } from "../../api/teacherService";
import { examService } from "../../api/examService";
import { Badge, Card, CardHeader, EmptyState, Skeleton, PageShell, StatCard } from "../../components/ui";
import DashboardGreeting from "../../components/common/DashboardGreeting";

const QUICK_ACTIONS = [
  { to: "/teacher/attendance", label: "Take attendance", hint: "Today's register", icon: CalendarCheck },
  { to: "/teacher/marks", label: "Enter marks", hint: "Published exams", icon: ClipboardList },
  { to: "/teacher/assignments", label: "Assignments", hint: "Set and grade work", icon: NotebookPen },
  { to: "/teacher/students", label: "My students", hint: "Class lists", icon: Users },
];

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
  return (
    <PageShell>
      <DashboardGreeting
        subtitle="Your classes, marks and notices in one place."
        aside={
          classTeacherOf.length > 0 && (
            <Badge icon={Star} className="px-3 py-1 text-sm">
              Class teacher of {classTeacherOf.join(", ")}
            </Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Class sections" value={classes.length} loading={loading} icon={BookOpen} sub="Where you teach a subject" />
        <StatCard label="Subjects" value={subjectCount} loading={loading} icon={Library} sub="Across all classes" />
        <StatCard label="Teaching slots" value={assignments.length} loading={loading} icon={Users} sub="Subject × section" />
        <StatCard
          label="Exams open for marks"
          value={openExams?.length ?? "—"}
          loading={loading}
          icon={ClipboardList}
          to="/teacher/marks"
          sub={openExams?.length ? openExams.map((e) => e.name).slice(0, 2).join(", ") : "None published right now"}
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
            <EmptyState compact icon={BookOpen} title="No classes yet" description="Ask the school admin to assign you to a class and subject for this year." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => (
                <div key={c.key} className="flex flex-col rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{c.name}</h3>
                    {c.isClassTeacher && <Badge>Class teacher</Badge>}
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
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <a.icon size={17} aria-hidden="true" />
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
    </PageShell>
  );
};

export default TeacherDashboard;
