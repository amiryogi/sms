import { useRef, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useNetworkState } from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, FileUp, ImageIcon, Paperclip, Send, X } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import { ALLOWED_MIME_TYPES, filesProblem, mimeTypeOf, type PickedFile } from "@/api/upload";
import { AppText, Badge, Button, Card, IconButton, ListItem, QueryView, Screen, SectionHeader, TextField } from "@/components/ui";
import { useUser } from "@/contexts/AuthContext";
import { useTheme } from "@/theme/ThemeProvider";
import type { Assignment, FileRef } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assets";
import { formatDate, formatDateTime, formatRelativeDay, fullName } from "@/utils/format";
import { hasRole } from "@/utils/roles";
import { portalKeys, useAssignment, useSubmitAssignment } from "./hooks";
import { SUBMISSION_LABEL } from "./labels";

const MAX_FILES = 3; // POST /submissions accepts up to 3 files

/**
 * One assignment. A student hands it in here (once: the server refuses a
 * second submission). Anyone else, a parent included, sees it read-only.
 */
export const AssignmentDetail = ({ id, studentId }: { id: number; studentId: number | null }) => {
  const user = useUser();
  const query = useAssignment(id);
  const qc = useQueryClient();
  const isStudent = hasRole(user.roles, "STUDENT");

  // A parent's detail has no submission; the child's list (?studentId=) has it.
  const fromList = studentId
    ? qc.getQueryData<Assignment[]>(portalKeys.assignments(studentId))?.find((a) => a.id === id)
    : undefined;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "Assignment" }} />
      <QueryView query={query}>
        {(a) => {
          const submission = a.submissions?.[0] ?? fromList?.submissions?.[0];
          return (
            <>
              <AppText variant="title">{a.title}</AppText>
              <AppText variant="muted" className="mt-1">
                {a.teacherSubject.classSubject.subject.name}
                {a.teacherSubject.user ? ` · ${fullName(a.teacherSubject.user)}` : ""}
              </AppText>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Badge label={a.dueDate ? `Due ${formatDate(a.dueDate, "bs")} (${formatRelativeDay(a.dueDate)})` : "No due date"} tone="neutral" />
                {a.totalMarks ? <Badge label={`${a.totalMarks} marks`} tone="brand" /> : null}
              </View>

              {a.description ? (
                <Card className="mt-4">
                  <AppText selectable>{a.description}</AppText>
                </Card>
              ) : null}

              {a.assignmentFiles.length ? (
                <>
                  <SectionHeader title="Attachments" />
                  <FileList files={a.assignmentFiles} />
                </>
              ) : null}

              <SectionHeader title={isStudent ? "Your work" : "Hand-in"} />
              {submission ? (
                <SubmissionCard submission={submission} totalMarks={a.totalMarks} />
              ) : isStudent ? (
                <SubmitForm assignmentId={a.id} />
              ) : (
                <Card>
                  <AppText variant="muted">Not handed in yet.</AppText>
                </Card>
              )}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
};

const FileList = ({ files }: { files: FileRef[] }) => (
  <Card className="p-0">
    {files.map((f) => {
      const url = resolveAssetUrl(f.fileUrl);
      return (
        <ListItem
          key={f.id}
          icon={Paperclip}
          title={f.fileName}
          subtitle={f.fileSize ? `${Math.ceil(f.fileSize / 1024)} KB` : null}
          onPress={url ? () => Linking.openURL(url) : undefined}
          accessibilityLabel={`Open ${f.fileName}`}
        />
      );
    })}
  </Card>
);

type SubmissionLike = NonNullable<Assignment["submissions"]>[number] & { content?: string | null; submissionFiles?: FileRef[] };

const SubmissionCard = ({ submission, totalMarks }: { submission: SubmissionLike; totalMarks: number | null }) => {
  const status = SUBMISSION_LABEL[submission.status] ?? { label: submission.status, tone: "neutral" as const };
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Badge label={status.label} tone={status.tone} />
        {submission.submittedAt ? <AppText variant="caption">{formatDateTime(submission.submittedAt)}</AppText> : null}
      </View>
      {submission.content ? <AppText selectable>{submission.content}</AppText> : null}
      {submission.submissionFiles?.length ? <FileList files={submission.submissionFiles} /> : null}
      {submission.marksObtained !== null && submission.marksObtained !== undefined ? (
        <AppText variant="heading">
          Marks: {Number(submission.marksObtained)}
          {totalMarks ? ` / ${totalMarks}` : ""}
        </AppText>
      ) : null}
      {submission.feedback ? (
        <View>
          <AppText variant="caption">Teacher&apos;s feedback</AppText>
          <AppText>{submission.feedback}</AppText>
        </View>
      ) : null}
    </Card>
  );
};

const SubmitForm = ({ assignmentId }: { assignmentId: number }) => {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const network = useNetworkState();
  const offline = network.isConnected === false;
  const submit = useSubmitAssignment(assignmentId);
  const { colors } = useTheme();
  // Two taps in the same frame both get here before the button re-renders as
  // busy: this ref lets only the first one send.
  const sending = useRef(false);

  const add = (picked: PickedFile[]) => {
    const next = [...files, ...picked];
    const problem = filesProblem(next, MAX_FILES);
    setError(problem);
    if (!problem) setFiles(next);
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: Object.keys(ALLOWED_MIME_TYPES) });
    if (res.canceled) return;
    add(res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: mimeTypeOf({ name: a.name, mimeType: a.mimeType }), size: a.size ?? null })));
  };

  const fromImage = (a: ImagePicker.ImagePickerAsset, i: number): PickedFile => {
    const name = a.fileName ?? `photo-${Date.now()}-${i}.jpg`;
    return { uri: a.uri, name, mimeType: mimeTypeOf({ name, mimeType: a.mimeType }), size: a.fileSize ?? null };
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.7 });
    if (!res.canceled) add(res.assets.map(fromImage));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Allow camera access in your phone's settings to take a photo of your work.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled) add(res.assets.map(fromImage));
  };

  const send = () => {
    if (!content.trim() && files.length === 0) {
      setError("Write something or attach a file before handing in.");
      return;
    }
    Alert.alert("Hand in?", "You can hand in only once. Your teacher sees it straight away.", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Hand in",
        onPress: () => {
          if (sending.current) return;
          sending.current = true;
          setError(null);
          submit.mutate(
            { content, files },
            {
              onError: (e) => setError((e as ApiFailure).message),
              onSettled: () => {
                sending.current = false;
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <Card className="gap-3">
      <TextField label="Answer or note (optional)" value={content} onChangeText={setContent} multiline numberOfLines={5} textAlignVertical="top" />
      {files.map((f, i) => (
        <View key={`${f.uri}-${i}`} className="flex-row items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <Paperclip size={16} color={colors.muted} />
          <AppText className="flex-1 text-sm" numberOfLines={1}>
            {f.name}
          </AppText>
          <IconButton icon={X} label={`Remove ${f.name}`} onPress={() => setFiles(files.filter((_, j) => j !== i))} />
        </View>
      ))}
      {files.length < MAX_FILES ? (
        <View className="flex-row flex-wrap gap-2">
          <Button title="File" icon={FileUp} variant="secondary" size="sm" onPress={pickDocument} />
          <Button title="Photo" icon={ImageIcon} variant="secondary" size="sm" onPress={pickPhoto} />
          <Button title="Camera" icon={Camera} variant="secondary" size="sm" onPress={takePhoto} />
        </View>
      ) : null}
      <AppText variant="caption">Up to {MAX_FILES} files, 5 MB each: images, PDF, Word, Excel or text.</AppText>
      {error ? (
        <AppText accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </AppText>
      ) : null}
      {offline ? <AppText variant="caption">You&apos;re offline. Connect to the internet to hand in.</AppText> : null}
      <Button title="Hand in" icon={Send} onPress={send} loading={submit.isPending} disabled={offline || submit.isPending} fullWidth />
    </Card>
  );
};
