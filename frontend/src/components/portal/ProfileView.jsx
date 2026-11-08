import React from "react";
import { UserRound, School, Phone, Info } from "lucide-react";
import { Card, CardHeader, Avatar, EmptyState, LoadingBlock } from "../ui";
import { formatDate } from "../../utils/format";

const Row = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
    <dt className="text-sm text-slate-500 sm:w-44 sm:shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-slate-900">{value || <span className="font-normal text-slate-400">Not recorded</span>}</dd>
  </div>
);

/**
 * A student's school record, read-only (from the portal overview). Students
 * and parents cannot edit it; the note says how to get it corrected.
 * Shared by the student and parent portals.
 */
const ProfileView = ({ overview, error }) => {
  if (error) return <Card><EmptyState icon={UserRound} title="Profile unavailable" description={error} /></Card>;
  if (!overview) return <Card><LoadingBlock text="Loading profile…" /></Card>;
  const s = overview.student;
  const e = overview.enrolment;
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-5">
        <Avatar src={s.avatarUrl} name={s.name} size="xl" />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900">{s.name}</h2>
          <p className="text-sm text-slate-500">
            {s.admissionNumber}
            {e ? ` · ${e.class.name} ${e.section.name}${e.rollNumber ? ` · Roll ${e.rollNumber}` : ""}` : ""}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={UserRound} title="Personal details" />
          <dl className="divide-y divide-slate-100">
            <Row label="Date of birth" value={s.dateOfBirth ? `${formatDate(s.dateOfBirth)}${s.dateOfBirthBs ? ` (${s.dateOfBirthBs} BS)` : ""}` : null} />
            <Row label="Gender" value={s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : null} />
            <Row label="Blood group" value={s.bloodGroup} />
            <Row label="Address" value={s.address} />
          </dl>
        </Card>
        <Card>
          <CardHeader icon={School} title="School record" />
          <dl className="divide-y divide-slate-100">
            <Row label="Admission number" value={s.admissionNumber} />
            <Row label="Admitted on" value={s.admissionDate ? formatDate(s.admissionDate) : null} />
            <Row label="Class this year" value={e ? `${e.class.name} ${e.section.name} · ${e.academicYear.name}` : "Not enrolled this year"} />
            <Row label="Class teacher" value={e?.classTeacher} />
          </dl>
        </Card>
        <Card>
          <CardHeader icon={Phone} title="Contact" />
          <dl className="divide-y divide-slate-100">
            <Row label="Email" value={s.email} />
            <Row label="Phone" value={s.phone} />
            <Row label="Emergency contact" value={s.emergencyContact} />
          </dl>
        </Card>
        <Card className="flex items-start gap-3 bg-slate-50/60">
          <Info size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Something wrong or out of date? Ask the school office to correct it. Only the school can change these details.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ProfileView;
