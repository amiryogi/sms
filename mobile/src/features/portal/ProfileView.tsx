import { View } from "react-native";
import { AppText, Avatar, Card, QueryView, Screen, SectionHeader } from "@/components/ui";
import { resolveAssetUrl } from "@/utils/assets";
import { formatAd } from "@/utils/format";
import { useOverview } from "./hooks";

const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) =>
  value === null || value === undefined || value === "" ? null : (
    <View className="flex-row justify-between gap-3 py-2">
      <AppText variant="muted">{label}</AppText>
      <AppText className="flex-1 text-right">{String(value)}</AppText>
    </View>
  );

/** The student's details as the school holds them. Changes go through the school office. */
export const ProfileView = ({ studentId }: { studentId: number }) => {
  const query = useOverview(studentId);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <QueryView query={query}>
        {({ student: s, enrolment: e, subjects }) => (
          <>
            <Card className="items-center gap-2">
              <Avatar name={s.name} uri={resolveAssetUrl(s.avatarUrl)} size={72} />
              <AppText variant="title" className="text-center">
                {s.name}
              </AppText>
              {e ? (
                <AppText variant="muted">
                  {e.class.name} {e.section.name}
                  {e.rollNumber ? ` · Roll ${e.rollNumber}` : ""} · {e.academicYear.name}
                </AppText>
              ) : null}
            </Card>

            <SectionHeader title="School record" />
            <Card>
              <Row label="Admission no." value={s.admissionNumber} />
              <Row label="Admitted" value={s.admissionDate ? formatAd(s.admissionDate) : null} />
              <Row label="Class teacher" value={e?.classTeacher} />
              <Row label="Username" value={s.username} />
            </Card>

            <SectionHeader title="Personal" />
            <Card>
              <Row label="Date of birth" value={s.dateOfBirth ? `${s.dateOfBirthBs ?? ""} BS (${formatAd(s.dateOfBirth)})` : null} />
              <Row label="Gender" value={s.gender} />
              <Row label="Blood group" value={s.bloodGroup} />
              <Row label="Address" value={s.address} />
              <Row label="Phone" value={s.phone} />
              <Row label="Email" value={s.email} />
              <Row label="Emergency contact" value={s.emergencyContact} />
            </Card>

            {subjects.length ? (
              <>
                <SectionHeader title="Subjects" />
                <Card>
                  {subjects.map((sub) => (
                    <Row key={sub.id} label={`${sub.name}${sub.isOptional ? " (optional)" : ""}`} value={sub.teacher ?? "—"} />
                  ))}
                </Card>
              </>
            ) : null}
            <AppText variant="caption" className="mt-4 text-center">
              Something wrong? Ask the school office to correct it.
            </AppText>
          </>
        )}
      </QueryView>
    </Screen>
  );
};
