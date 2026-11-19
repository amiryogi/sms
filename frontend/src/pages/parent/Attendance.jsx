import React from "react";
import ParentPage from "../../components/portal/ParentPage";
import AttendanceView from "../../components/portal/AttendanceView";

/** A linked child's attendance (the API refuses any other student). */
const ParentAttendance = () => (
  <ParentPage title="Attendance" description="Your child's register this year, by Nepali month." render={(child) => <AttendanceView studentId={child.id} />} />
);

export default ParentAttendance;
