import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Mail, CalendarCheck, RotateCw } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import { teacherService } from "../../api/teacherService";
import { PageHeader, PageShell, Card, SegmentedControl, Avatar, Button, EmptyState, LoadingBlock, StatCard, StatGroup } from "../../components/ui";

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
    { header: "Roll", numeric: true, className: "col-roll w-16 text-slate-500", render: (s) => s.rollNumber || "—" },
    {
      header: "Student",
      className: "col-name",
      // One line per student, like a register; the email is an icon link, not a second line.
      render: (s) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar src={s.avatarUrl} name={s.fullName} size="xs" />
          <span className="truncate font-medium text-slate-900">{s.fullName}</span>
          {s.email && (
            <a
              href={`mailto:${s.email}`}
              aria-label={`Email ${s.fullName}`}
              title={s.email}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Mail size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      ),
    },
    { header: "Admission no.", render: (s) => <span className="font-mono text-xs text-slate-600">{s.admissionNumber || "—"}</span> },
    ...(section === "all" ? [{ header: "Class", render: (s) => <span className="text-sm whitespace-nowrap text-slate-700">{s.classLabel}</span> }] : []),
  ];

  const header = <PageHeader title="My students" description="Students in the classes you teach this year." />;

  if (loading) {
    return (
      <PageShell>
        {header}
        <LoadingBlock text="Loading your students…" />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        {header}
        <Card>
          <EmptyState icon={Users} title="Couldn't load your students" description={`${error}. Check your connection and try again.`} action={<Button icon={RotateCw} variant="secondary" onClick={load}>Try again</Button>} />
        </Card>
      </PageShell>
    );
  }

  const { summary } = data;

  return (
    <PageShell>
      {header}

      {summary && (
        <StatGroup columns={3}>
          <StatCard label="Classes" value={summary.totalClasses} />
          <StatCard label="Sections" value={summary.totalSections} />
          <StatCard label="Students" value={summary.totalStudents} />
        </StatGroup>
      )}

      {sections.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No students yet" description="You don't have any class assignments for the current academic year." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* A filter on one list, so a value switch, not tabs (tabs switch panels). */}
            <SegmentedControl
              label="Class"
              value={section}
              onChange={setSection}
              options={[
                { value: "all", label: `All classes (${students.length})` },
                ...sections.map((s) => ({ value: s.key, label: `${s.label} (${s.count})` })),
              ]}
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
    </PageShell>
  );
};

export default MyStudents;
