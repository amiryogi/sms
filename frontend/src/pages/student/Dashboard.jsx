import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, EmptyState, Skeleton, Avatar } from "../../components/ui";
import NoticesFeed from "../../components/common/NoticesFeed";
import useStudentOverview from "../../components/portal/useStudentOverview";
import { SummaryTiles, UpcomingExamsCard, AssignmentsDueCard, SubjectsCard } from "../../components/portal/OverviewCards";
import { formatDate, fullName } from "../../utils/format";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** A student's home: attendance, latest result, fees, assignments, exams, notices. */
const StudentDashboard = () => {
  const { user } = useAuth();
  const studentId = user?.student?.id;
  const { data, error } = useStudentOverview(studentId);

  if (!studentId) return <Card><EmptyState icon={UserRound} title="No student profile" description="This account is not linked to a student record. Ask the school office." /></Card>;
  if (error) return <Card><EmptyState icon={UserRound} title="Couldn't load your dashboard" description={error} /></Card>;

  const e = data?.enrolment;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={user?.avatarUrl} name={fullName(user)} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {greeting()}, {user?.firstName}
          </h1>
          {e ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {e.class.name} {e.section.name}
              {e.rollNumber ? ` · Roll ${e.rollNumber}` : ""} · {e.academicYear.name}
              {e.classTeacher ? ` · Class teacher ${e.classTeacher}` : ""}
            </p>
          ) : (
            data && <p className="mt-0.5 text-sm text-amber-700">Not enrolled in a class this year</p>
          )}
        </div>
        <Link to="/student/profile" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
          My profile <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}</div>
      ) : (
        <>
          <SummaryTiles overview={data} base="/student" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <AssignmentsDueCard assignments={data.assignments} to="/student/assignments" />
              {data.subjects.length > 0 && <SubjectsCard subjects={data.subjects} />}
            </div>
            <div className="space-y-6">
              <UpcomingExamsCard exams={data.upcomingExams} />
              <Card>
                <CardHeader
                  title="Notices"
                  actions={
                    <Link to="/student/notices" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
                      All <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  }
                />
                <NoticesFeed limit={4} showViewAll={false} compact />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
