import React from "react";
import { CalendarCheck } from "lucide-react";
import ParentPage from "../../components/portal/ParentPage";
import AttendanceView from "../../components/portal/AttendanceView";

/** A linked child's attendance (the API refuses any other student). */
const ParentAttendance = () => (
  <ParentPage icon={CalendarCheck} title="Attendance" description="Your child's register this year, by Nepali month." maxWidth="max-w-5xl" render={(child) => <AttendanceView studentId={child.id} />} />
);

export default ParentAttendance;
