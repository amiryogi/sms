import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, EmptyState, Skeleton, Avatar, PageShell } from "../../components/ui";
import DashboardGreeting from "../../components/common/DashboardGreeting";
import NoticesFeed from "../../components/common/NoticesFeed";
import useStudentOverview from "../../components/portal/useStudentOverview";
import { SummaryTiles, UpcomingExamsCard, AssignmentsDueCard, SubjectsCard } from "../../components/portal/OverviewCards";
import { fullName } from "../../utils/format";

/** "Grade 9 A, roll 4, 2025-2026. Class teacher Sita Rai." */
const enrolmentLine = (e) =>
  `${e.class.name} ${e.section.name}${e.rollNumber ? `, roll ${e.rollNumber}` : ""}, ${e.academicYear.name}.${e.classTeacher ? ` Class teacher ${e.classTeacher}.` : ""}`;

/** A student's home: attendance, latest result, fees, assignments, exams, notices. */
const StudentDashboard = () => {
  const { user } = useAuth();
  const studentId = user?.student?.id;
  const { data, error } = useStudentOverview(studentId);

  if (!studentId) {
    return (
      <Card>
        <EmptyState icon={UserRound} title="No student profile" description="This account is not linked to a student record. Ask the school office to link it." />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <EmptyState icon={UserRound} title="Couldn't load your dashboard" description={error} />
      </Card>
    );
  }

  const e = data?.enrolment;
  return (
    <PageShell>
      <DashboardGreeting
        leading={<Avatar src={user?.avatarUrl} name={fullName(user)} size="lg" />}
        subtitle={e ? enrolmentLine(e) : data && <span className="text-warn">Not enrolled in a class this year</span>}
        aside={
          <Link to="/student/profile" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            My profile <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
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
                      All notices <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  }
                />
                <NoticesFeed limit={4} showViewAll={false} compact />
              </Card>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
};

export default StudentDashboard;
