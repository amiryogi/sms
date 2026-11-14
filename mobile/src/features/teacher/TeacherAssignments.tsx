import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Linking, ScrollView, Switch, View } from "react-native";
import { router, Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useNetworkState } from "expo-network";
import { ClipboardList, FileUp, Paperclip, Plus, Send, Trash2, X } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import { ALLOWED_MIME_TYPES, filesProblem, mimeTypeOf, type PickedFile } from "@/api/upload";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  IconButton,
  ListItem,
  OfflineBanner,
  PressableCard,
  QueryView,
  Screen,
  SectionHeader,
  SkeletonList,
  TextField,
} from "@/components/ui";
import { useAssignment } from "@/features/portal/hooks";
import { SUBMISSION_LABEL } from "@/features/portal/labels";
import type { Assignment } from "@/types/api";
import type { SubmissionDetail } from "@/types/teacher";
import { useTheme } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";
import { formatDate, formatDateTime, formatRelativeDay, fullName } from "@/utils/format";
import { kathmanduToday } from "@/utils/nepaliDate";
import { useCreateAssignment, useDeleteAssignment, useGrade, useOwnAssignments, useSubmissions, useTeacherAssignments, useUpdateAssignment } from "./hooks";
import { sectionLabel, sectionsFrom } from "./sections";

const MAX_FILES = 5; // POST /assignments accepts up to 5 files

/* ------------------------------------------------------------------ list */

export const TeacherAssignmentsList = ({ base }: { base: string }) => {
  const query = useOwnAssignments();
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <OfflineBanner />
      <QueryView
        query={query}
        loading={<View className="p-4"><SkeletonList /></View>}
        isEmpty={(l) => l.length === 0}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            action={<Button title="New assignment" icon={Plus} className="mt-3" onPress={() => router.push(`${base}/assignments/new` as never)} />}
          />
        }
      >
        {(list) => (
          <FlatList
            data={list}
            keyExtractor={(a) => String(a.id)}
            contentContainerClassName="gap-3 p-4 pb-24"
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            renderItem={({ item }) => (
              <PressableCard className="gap-1.5" onPress={() => router.push(`${base}/assignments/${item.id}` as never)}>
                <View className="flex-row items-start justify-between gap-2">
                  <AppText className="flex-1 font-semibold" numberOfLines={2}>
                    {item.title}
                  </AppText>
                  {item.isPublished ? <Badge label="Published" tone="success" /> : <Badge label="Draft" tone="neutral" />}
                </View>
                <AppText variant="muted">
                  {item.teacherSubject.classSubject.subject.name} · {item.teacherSubject.classSubject.class.name} {item.teacherSubject.section.name}
                </AppText>
                <AppText variant="caption">
                  {item.dueDate ? `Due ${formatDate(item.dueDate, "bs")} (${formatRelativeDay(item.dueDate)})` : "No due date"} · {item._count?.submissions ?? 0} handed in
                </AppText>
              </PressableCard>
            )}
          />
        )}
      </QueryView>
      {query.data?.length ? (
        <View className="absolute bottom-6 right-4">
          <Button title="New" icon={Plus} onPress={() => router.push(`${base}/assignments/new` as never)} />
        </View>
      ) : null}
    </View>
  );
};

/* ------------------------------------------------------------------- new */

export const NewAssignmentScreen = ({ base }: { base: string }) => {
  const assignments = useTeacherAssignments();
  const sections = useMemo(() => sectionsFrom(assignments.data ?? []), [assignments.data]);
  const options = useMemo(
    () => sections.flatMap((s) => s.subjects.map((sub) => ({ id: sub.teacherSubjectId, label: `${sub.subjectName} · ${sectionLabel(s)}` }))),
    [sections],
  );
  const [teacherSubjectId, setTeacherSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [totalMarks, setTotalMarks] = useState("");
  const [publish, setPublish] = useState(true);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateAssignment();
  const sending = useRef(false);
  const offline = useNetworkState().isConnected === false;
  const { colors } = useTheme();
  const chosen = teacherSubjectId ?? options[0]?.id ?? null;

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: Object.keys(ALLOWED_MIME_TYPES) });
    if (res.canceled) return;
    const next = [...files, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: mimeTypeOf({ name: a.name, mimeType: a.mimeType }), size: a.size ?? null }))];
    const problem = filesProblem(next, MAX_FILES);
    setError(problem);
    if (!problem) setFiles(next);
  };

  const submit = () => {
    if (sending.current) return;
    if (!chosen) return setError("Choose the class and subject.");
    if (!title.trim()) return setError("Give the assignment a title.");
    const marks = totalMarks.trim() ? Number(totalMarks) : undefined;
    if (marks !== undefined && (!Number.isInteger(marks) || marks < 1)) return setError("Total marks must be a whole number of 1 or more.");
    setError(null);
    sending.current = true;
    create.mutate(
      { teacherSubjectId: chosen, title, description, dueDate: dueDate ?? undefined, totalMarks: marks, isPublished: publish, files },
      {
        onSuccess: (a) => router.replace(`${base}/assignments/${a.id}` as never),
        onError: (e) => setError((e as ApiFailure).message),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "New assignment" }} />
      {assignments.data && options.length === 0 ? (
        <EmptyState title="No subjects assigned" message="You can set work only for subjects you teach this year." />
      ) : (
        <View className="gap-4">
          <View className="gap-1.5">
            <AppText variant="label">Class and subject</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {options.map((o) => (
                <Chip key={o.id} label={o.label} selected={o.id === chosen} onPress={() => setTeacherSubjectId(o.id)} />
              ))}
            </ScrollView>
          </View>
          <TextField label="Title" value={title} onChangeText={setTitle} maxLength={255} />
          <TextField label="Instructions (optional)" value={description} onChangeText={setDescription} multiline numberOfLines={5} textAlignVertical="top" />
          <DateField label="Due date (optional)" value={dueDate} onChange={setDueDate} minimumDate={kathmanduToday()} optional />
          <TextField label="Total marks (optional)" value={totalMarks} onChangeText={setTotalMarks} keyboardType="number-pad" maxLength={4} />
          <View className="flex-row items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-900">
            <View className="flex-1">
              <AppText className="font-medium">Publish now</AppText>
              <AppText variant="caption">Students and parents see it once it is published.</AppText>
            </View>
            <Switch value={publish} onValueChange={setPublish} accessibilityLabel="Publish now" />
          </View>
          {files.map((f, i) => (
            <View key={`${f.uri}-${i}`} className="flex-row items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <Paperclip size={16} color={colors.muted} />
              <AppText className="flex-1 text-sm" numberOfLines={1}>
                {f.name}
              </AppText>
              <IconButton icon={X} label={`Remove ${f.name}`} onPress={() => setFiles(files.filter((_, j) => j !== i))} />
            </View>
          ))}
          {files.length < MAX_FILES ? <Button title="Attach a file" icon={FileUp} variant="secondary" onPress={pick} /> : null}
          {error ? (
            <AppText accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </AppText>
          ) : null}
          {offline ? <AppText variant="caption">You&apos;re offline. Connect to save the assignment.</AppText> : null}
          <Button title={publish ? "Publish assignment" : "Save as draft"} icon={Send} loading={create.isPending} disabled={offline || create.isPending} onPress={submit} fullWidth />
        </View>
      )}
    </Screen>
  );
};

/* ---------------------------------------------------- detail + submissions */

export const TeacherAssignmentDetail = ({ id }: { id: number }) => {
  const query = useAssignment(id);
  const submissions = useSubmissions(id);
  const update = useUpdateAssignment(id);
  const remove = useDeleteAssignment();
  const [error, setError] = useState<string | null>(null);

  const togglePublish = (a: Assignment) =>
    update.mutate({ isPublished: !a.isPublished }, { onError: (e) => setError((e as ApiFailure).message) });

  const confirmDelete = () =>
    Alert.alert("Delete assignment?", "This can't be undone. It isn't possible once students have handed in.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove.mutate(id, { onSuccess: () => router.back(), onError: (e) => setError((e as ApiFailure).message) }),
      },
    ]);

  return (
    <Screen
      onRefresh={() => {
        query.refetch();
        submissions.refetch();
      }}
      refreshing={query.isRefetching || submissions.isRefetching}
    >
      <Stack.Screen options={{ title: "Assignment" }} />
      <QueryView query={query}>
        {(a) => (
          <>
            <View className="flex-row items-start justify-between gap-2">
              <AppText variant="title" className="flex-1">
                {a.title}
              </AppText>
              {a.isPublished ? <Badge label="Published" tone="success" /> : <Badge label="Draft" tone="neutral" />}
            </View>
            <AppText variant="muted" className="mt-1">
              {a.teacherSubject.classSubject.subject.name} · {a.teacherSubject.classSubject.class.name} {a.teacherSubject.section.name}
            </AppText>
            <AppText variant="caption" className="mt-1">
              {a.dueDate ? `Due ${formatDate(a.dueDate)}` : "No due date"}
              {a.totalMarks ? ` · ${a.totalMarks} marks` : ""}
            </AppText>
            {a.description ? (
              <Card className="mt-3">
                <AppText selectable>{a.description}</AppText>
              </Card>
            ) : null}
            {a.assignmentFiles.length ? (
              <Card className="mt-3 p-0">
                {a.assignmentFiles.map((f) => (
                  <ListItem key={f.id} icon={Paperclip} title={f.fileName} onPress={() => { const u = resolveAssetUrl(f.fileUrl); if (u) Linking.openURL(u); }} />
                ))}
              </Card>
            ) : null}
            <View className="mt-3 flex-row gap-2">
              <Button title={a.isPublished ? "Unpublish" : "Publish"} variant="secondary" size="sm" loading={update.isPending} onPress={() => togglePublish(a)} />
              <Button title="Delete" icon={Trash2} variant="ghost" size="sm" onPress={confirmDelete} disabled={(submissions.data?.length ?? 0) > 0} />
            </View>
            {error ? <AppText className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</AppText> : null}

            <SectionHeader title={`Handed in (${submissions.data?.length ?? 0})`} />
            <QueryView query={submissions} isEmpty={(l) => l.length === 0} empty={<AppText variant="muted">No one has handed in yet.</AppText>}>
              {(list) => (
                <View className="gap-3">
                  {list.map((s) => (
                    <SubmissionCard key={s.id} submission={s} assignmentId={a.id} totalMarks={a.totalMarks} />
                  ))}
                </View>
              )}
            </QueryView>
          </>
        )}
      </QueryView>
    </Screen>
  );
};

const SubmissionCard = ({ submission: s, assignmentId, totalMarks }: { submission: SubmissionDetail; assignmentId: number; totalMarks: number | null }) => {
  const grade = useGrade(assignmentId);
  const [marks, setMarks] = useState(s.marksObtained !== null && s.marksObtained !== undefined ? String(Number(s.marksObtained)) : "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const status = SUBMISSION_LABEL[s.status] ?? { label: s.status, tone: "neutral" as const };
  const name = fullName(s.student.user);

  const send = () => {
    const n = Number(marks);
    if (marks.trim() === "" || Number.isNaN(n) || n < 0) return setError("Marks must be 0 or more.");
    if (totalMarks && n > totalMarks) return setError(`Marks can't be more than ${totalMarks}.`);
    setError(null);
    grade.mutate(
      { submissionId: s.id, marksObtained: n, feedback: feedback.trim() || undefined },
      { onSuccess: () => setOpen(false), onError: (e) => setError((e as ApiFailure).message) },
    );
  };

  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-3">
        <Avatar name={name} uri={resolveAssetUrl(s.student.user.avatarUrl)} size={36} />
        <View className="flex-1">
          <AppText className="font-medium">{name}</AppText>
          <AppText variant="caption">{s.submittedAt ? formatDateTime(s.submittedAt) : ""}</AppText>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {s.content ? <AppText selectable>{s.content}</AppText> : null}
      {s.submissionFiles.map((f) => (
        <ListItem key={f.id} icon={Paperclip} title={f.fileName} className="px-0" onPress={() => { const u = resolveAssetUrl(f.fileUrl); if (u) Linking.openURL(u); }} />
      ))}
      {!open ? (
        <View className="flex-row items-center justify-between">
          <AppText variant="label">
            {s.marksObtained !== null && s.marksObtained !== undefined ? `Marks: ${Number(s.marksObtained)}${totalMarks ? ` / ${totalMarks}` : ""}` : "Not graded"}
          </AppText>
          <Button title={s.marksObtained !== null && s.marksObtained !== undefined ? "Change grade" : "Grade"} size="sm" variant="secondary" onPress={() => setOpen(true)} />
        </View>
      ) : (
        <View className="gap-3">
          <TextField label={`Marks${totalMarks ? ` (out of ${totalMarks})` : ""}`} value={marks} onChangeText={setMarks} keyboardType="decimal-pad" maxLength={6} />
          <TextField label="Feedback (optional)" value={feedback} onChangeText={setFeedback} multiline />
          {error ? <AppText className="text-sm text-red-600 dark:text-red-400">{error}</AppText> : null}
          <View className="flex-row gap-2">
            <Button title="Save grade" className="flex-1" loading={grade.isPending} disabled={grade.isPending} onPress={send} />
            <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      )}
    </Card>
  );
};
