import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, EmptyState, Skeleton } from "../../components/ui";
import NoticesFeed from "../../components/common/NoticesFeed";
import ChildSwitcher from "../../components/portal/ChildSwitcher";
import useChildren from "../../components/portal/useChildren";
import useStudentOverview from "../../components/portal/useStudentOverview";
import { SummaryTiles, UpcomingExamsCard, AssignmentsDueCard, SubjectsCard } from "../../components/portal/OverviewCards";
import { formatDate } from "../../utils/format";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** One child's overview: the same cards a student sees, linking to the parent pages. */
const ChildOverview = ({ childId, query }) => {
  const { data, error } = useStudentOverview(childId);
  if (error) return <Card><EmptyState icon={UserRound} title="Couldn't load this child's overview" description={error} /></Card>;
  if (!data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}</div>;
  const e = data.enrolment;
  return (
    <>
      {e && (
        <p className="-mt-2 text-sm text-slate-500">
          {e.class.name} {e.section.name}
          {e.rollNumber ? ` · Roll ${e.rollNumber}` : ""} · {e.academicYear.name}
          {e.classTeacher ? ` · Class teacher ${e.classTeacher}` : ""}
          <Link to={`/parent/profile${query}`} className="ml-3 font-medium text-brand-700 hover:text-brand-800">Profile</Link>
        </p>
      )}
      <SummaryTiles overview={data} base="/parent" query={query} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AssignmentsDueCard assignments={data.assignments} to={`/parent/assignments${query}`} />
          {data.subjects.length > 0 && <SubjectsCard subjects={data.subjects} />}
        </div>
        <UpcomingExamsCard exams={data.upcomingExams} />
      </div>
    </>
  );
};

/** A parent's home: pick a child, see how they are doing, read school notices. */
const ParentDashboard = () => {
  const { user } = useAuth();
  const family = useChildren();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {greeting()}, {user?.firstName}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {family.kids?.length > 1 ? `You have ${family.kids.length} children at ${user?.school?.name || "the school"}.` : `Here's how things are going at ${user?.school?.name || "school"}.`}
        </p>
      </div>

      <ChildSwitcher {...family} />

      {family.child && <ChildOverview key={family.child.id} childId={family.child.id} query={family.query} />}

      <Card>
        <CardHeader
          title="School notices"
          actions={
            <Link to="/parent/notices" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <NoticesFeed limit={4} showViewAll={false} compact />
      </Card>
    </div>
  );
};

export default ParentDashboard;
