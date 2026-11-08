import React from "react";
import { CalendarCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";
import AttendanceView from "../../components/portal/AttendanceView";

/** The signed-in student's attendance (the API returns only their own). */
const StudentAttendance = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={CalendarCheck} title="My attendance" description="This year's register, by Nepali month." />
      <AttendanceView studentId={user?.student?.id} />
    </div>
  );
};

export default StudentAttendance;
