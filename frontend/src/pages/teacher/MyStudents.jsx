import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, Layers, Mail, CalendarCheck, RotateCw } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";
import { teacherService } from "../../api/teacherService";
import { PageHeader, Card, Tabs, Avatar, Button, EmptyState, LoadingBlock } from "../../components/ui";

/** Students in the class-sections the teacher is assigned to this year. */
const MyStudents = () => {
  const [data, setData] = useState({ summary: null, classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [section, setSection] = useState("all"); // "all" | "<classId>-<sectionId>"
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teacherService.getMyStudents();
      setData(response.data || { summary: null, classes: [] });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Flatten class -> section -> students into sections and one student list.
  const { sections, students } = useMemo(() => {
    const secs = [];
    const all = [];
    (data.classes || []).forEach((cls) =>
      cls.sections.forEach((sec) => {
        const key = `${cls.classId}-${sec.sectionId}`;
        secs.push({ key, label: `${cls.className} ${sec.sectionName}`, count: sec.students.length });
        sec.students.forEach((s) => all.push({ ...s, sectionKey: key, classLabel: `${cls.className} ${sec.sectionName}` }));
      }),
    );
    return { sections: secs, students: all };
  }, [data.classes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (section !== "all" && s.sectionKey !== section) return false;
      if (!q) return true;
      return [s.fullName, s.admissionNumber, s.email, s.rollNumber?.toString()].some((v) => v?.toLowerCase().includes(q));
    });
  }, [students, section, search]);

  const columns = [
    { header: "Roll", className: "col-roll w-16 tabular-nums text-slate-500", render: (s) => s.rollNumber || "—" },
    {
      header: "Student",
      className: "col-name",
      render: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={s.avatarUrl} name={s.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{s.fullName}</p>
            {s.email && (
              <a href={`mailto:${s.email}`} className="inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-brand-700">
                <Mail size={11} aria-hidden="true" /> {s.email}
              </a>
            )}
          </div>
        </div>
      ),
    },
    { header: "Admission no.", render: (s) => <span className="font-mono text-xs text-slate-600">{s.admissionNumber || "—"}</span> },
    ...(section === "all" ? [{ header: "Class", render: (s) => <span className="text-sm whitespace-nowrap text-slate-700">{s.classLabel}</span> }] : []),
  ];

  if (loading) return <LoadingBlock text="Loading your students…" />;

  if (error) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState icon={Users} title="Couldn't load your students" description={error} action={<Button icon={RotateCw} variant="secondary" onClick={load}>Try again</Button>} />
      </Card>
    );
  }

  const { summary } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader icon={Users} title="My Students" description="Students in the classes you teach this year." />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Classes" value={summary.totalClasses} icon={BookOpen} color="primary" />
          <StatCard title="Sections" value={summary.totalSections} icon={Layers} color="info" />
          <StatCard title="Students" value={summary.totalStudents} icon={Users} color="success" />
        </div>
      )}

      {sections.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No students yet" description="You don't have any class assignments for the current academic year." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={section}
              onChange={setSection}
              tabs={[{ value: "all", label: "All classes", count: students.length }, ...sections.map((s) => ({ value: s.key, label: s.label, count: s.count }))]}
            />
            {section !== "all" && (
              <Link
                to={`/teacher/attendance?class=${section}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                <CalendarCheck size={15} aria-hidden="true" /> Take attendance
              </Link>
            )}
          </div>

          <DataTable
            columns={columns}
            data={visible}
            rowKey={(s) => s.studentId}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search students…"
            emptyMessage="No students match"
            emptyIcon={Users}
          />
        </>
      )}
    </div>
  );
};

export default MyStudents;
