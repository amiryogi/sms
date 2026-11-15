import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import { Users } from "lucide-react-native";
import { AppText, Avatar, Card, Chip, Divider, EmptyState, QueryView, Screen } from "@/components/ui";
import { resolveAssetUrl } from "@/utils/assets";
import { useMyStudents } from "./hooks";

/** Students of the teacher's current-year sections (GET /teachers/my-students). */
export const MyStudents = () => {
  const query = useMyStudents();
  const [key, setKey] = useState<string | null>(null);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "My students" }} />
      <QueryView
        query={query}
        isEmpty={(d) => Array.isArray(d) || d.classes.length === 0}
        empty={<EmptyState icon={Users} title="No students" message="You have no class this academic year." />}
      >
        {(data) => {
          if (Array.isArray(data)) return null;
          const sections = data.classes.flatMap((c) => c.sections.map((s) => ({ key: `${c.classId}:${s.sectionId}`, label: `${c.className} ${s.sectionName}`, students: s.students })));
          const current = sections.find((s) => s.key === key) ?? sections[0]!;
          return (
            <>
              <AppText variant="muted">
                {data.summary.totalStudents} students in {data.summary.totalSections} section(s)
              </AppText>
              {sections.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-3">
                  {sections.map((s) => (
                    <Chip key={s.key} label={s.label} selected={s.key === current.key} onPress={() => setKey(s.key)} />
                  ))}
                </ScrollView>
              ) : null}
              <Card className="mt-2 p-0">
                {current.students.map((st, i) => (
                  <View key={st.studentId}>
                    {i > 0 ? <Divider className="ml-16" /> : null}
                    <View className="flex-row items-center gap-3 px-4 py-3">
                      <Avatar name={st.fullName} uri={resolveAssetUrl(st.avatarUrl)} size={36} />
                      <View className="flex-1">
                        <AppText className="font-medium">{st.fullName}</AppText>
                        <AppText variant="caption">
                          {st.rollNumber ? `Roll ${st.rollNumber}` : "No roll number"}
                          {st.admissionNumber ? ` · ${st.admissionNumber}` : ""}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
};
