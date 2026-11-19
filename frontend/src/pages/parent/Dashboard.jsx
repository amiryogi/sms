import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, EmptyState, Skeleton, PageShell } from "../../components/ui";
import DashboardGreeting from "../../components/common/DashboardGreeting";
import NoticesFeed from "../../components/common/NoticesFeed";
import ChildSwitcher from "../../components/portal/ChildSwitcher";
import useChildren from "../../components/portal/useChildren";
import useStudentOverview from "../../components/portal/useStudentOverview";
import { SummaryTiles, UpcomingExamsCard, AssignmentsDueCard, SubjectsCard } from "../../components/portal/OverviewCards";

/** One child's overview: the same cards a student sees, linking to the parent pages. */
const ChildOverview = ({ childId, query }) => {
  const { data, error } = useStudentOverview(childId);
  if (error) return <Card><EmptyState icon={UserRound} title="Couldn't load this child's overview" description={error} /></Card>;
  if (!data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>;
  const e = data.enrolment;
  return (
    <>
      {e && (
        <p className="-mt-2 text-sm text-slate-500">
          {e.class.name} {e.section.name}
          {e.rollNumber ? `, roll ${e.rollNumber}` : ""}, {e.academicYear.name}.
          {e.classTeacher ? ` Class teacher ${e.classTeacher}.` : ""}
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
  const school = user?.school?.name;

  return (
    <PageShell>
      <DashboardGreeting
        subtitle={family.kids?.length > 1 ? `You have ${family.kids.length} children at ${school || "the school"}.` : `Here's how things are going at ${school || "school"}.`}
      />

      <ChildSwitcher {...family} />

      {family.child && <ChildOverview key={family.child.id} childId={family.child.id} query={family.query} />}

      <Card>
        <CardHeader
          title="School notices"
          actions={
            <Link to="/parent/notices" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              All notices <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <NoticesFeed limit={4} showViewAll={false} compact />
      </Card>
    </PageShell>
  );
};

export default ParentDashboard;
