import React from "react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, PageShell } from "../../components/ui";
import AttendanceView from "../../components/portal/AttendanceView";

/** The signed-in student's attendance (the API returns only their own). */
const StudentAttendance = () => {
  const { user } = useAuth();
  return (
    <PageShell>
      <PageHeader title="My attendance" description="This year's register, by Nepali month." />
      <AttendanceView studentId={user?.student?.id} />
    </PageShell>
  );
};

export default StudentAttendance;
