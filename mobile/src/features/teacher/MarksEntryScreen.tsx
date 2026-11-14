import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useNetworkState } from "expo-network";
import { Lock, Save } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import { AppText, Badge, Button, cn, EmptyState, ErrorState, OfflineBanner, SkeletonList } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { useDraft, useMarksStudents, useSaveMarks } from "./hooks";
import { lineErrors, limitsOf, linesFromServer, stats, toPayload, type Limits, type MarksLine } from "./marksSheet";

/**
 * Enter one subject's marks for one section. Limits are the exam's snapshot
 * (theory / practical full marks); the server re-checks everything and only
 * accepts marks while the exam is PUBLISHED.
 */
export const MarksEntryScreen = ({ examSubjectId, sectionId, title, examName }: { examSubjectId: number; sectionId: number; title?: string; examName?: string }) => {
  const query = useMarksStudents(examSubjectId, sectionId);
  const save = useSaveMarks();
  const network = useNetworkState();
  const offline = network.isConnected === false;
  const { draft, loaded, save: saveDraft, clear: clearDraft } = useDraft<MarksLine[]>(`marks.${examSubjectId}.${sectionId}`);

  const saved = useMemo(() => (query.data ? linesFromServer(query.data) : []), [query.data]);
  const limits = useMemo<Limits | null>(() => (query.data ? limitsOf(query.data.examSubject) : null), [query.data]);
  // What is on screen: the user's edits, else an unsent draft for this exact
  // subject and section, else what the server has.
  const [edited, setEdited] = useState<MarksLine[] | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const sending = useRef(false);
  const { colors } = useTheme();

  const draftUsable = useMemo(() => {
    if (!draft || !limits) return false;
    const ids = new Set(saved.map((l) => l.studentId));
    return draft.length === saved.length && draft.every((l) => ids.has(l.studentId)) && stats(draft, saved, limits).changed > 0;
  }, [draft, saved, limits]);
  const restored = edited === null && draftUsable;
  const lines: MarksLine[] | null = query.data ? (edited ?? (draftUsable && draft ? draft : saved)) : null;
  // Right after a save, wait for the refetched marks: never show the pre-save copy.
  const reloading = savedAt > 0 && query.dataUpdatedAt < savedAt;

  const status = query.data?.examSubject.exam.status;
  const editable = status === "PUBLISHED";

  const edit = (studentId: number, patch: Partial<MarksLine>) => {
    if (!lines) return;
    const next = lines.map((l) => (l.studentId === studentId ? { ...l, ...patch } : l));
    setEdited(next);
    setMessage(null);
    saveDraft(next);
  };

  const header = <Stack.Screen options={{ title: title ?? "Marks" }} />;

  if (query.data === undefined || lines === null || !limits || !loaded || reloading) {
    return (
      <View className="flex-1 bg-slate-50 p-4 dark:bg-slate-950">
        {header}
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList rows={6} />}
      </View>
    );
  }

  const st = stats(lines, saved, limits);

  const submit = () => {
    if (sending.current) return;
    if (st.invalid) {
      setMessage({ tone: "danger", text: `Fix the ${st.invalid} highlighted row(s) first.` });
      return;
    }
    const payload = toPayload(examSubjectId, sectionId, lines, limits);
    if (payload.results.length === 0) {
      setMessage({ tone: "danger", text: "Enter marks for at least one student first." });
      return;
    }
    Alert.alert("Save marks?", `${title ?? ""}\n${payload.results.length} student(s): ${st.entered} with marks, ${st.absent} absent.`, [
      { text: "Check again", style: "cancel" },
      {
        text: "Save",
        onPress: () => {
          sending.current = true;
          save.mutate(payload, {
            onSuccess: ({ message: m }) => {
              clearDraft();
              setEdited(null);
              setSavedAt(Date.now()); // show the refetched marks, not this copy
              setMessage({ tone: "success", text: m || `Marks saved for ${payload.results.length} students.` });
            },
            onError: (e) => setMessage({ tone: "danger", text: (e as ApiFailure).message }),
            onSettled: () => {
              sending.current = false;
            },
          });
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {header}
      <OfflineBanner />
      <View className="gap-2 px-4 pt-3">
        {examName ? <AppText variant="muted">{examName}</AppText> : null}
        <View className="flex-row flex-wrap gap-2">
          {limits.hasTheory ? <Badge label={`Theory out of ${limits.theoryMax}`} tone="brand" /> : null}
          {limits.hasPractical ? <Badge label={`Practical out of ${limits.practicalMax}`} tone="brand" /> : null}
          <Badge label={`Pass ${query.data.examSubject.passMarks} / ${query.data.examSubject.fullMarks}`} tone="neutral" />
        </View>
        {!editable ? (
          <View className="flex-row items-center gap-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <Lock size={16} color={colors.muted} />
            <AppText className="flex-1 text-sm">This exam is {status?.toLowerCase()}. Marks can be changed only while it is published.</AppText>
          </View>
        ) : null}
        {restored ? (
          <View className="flex-row items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
            <AppText className="flex-1 text-sm">Unsent marks from earlier are shown. Save them or discard.</AppText>
            <Button
              title="Discard"
              size="sm"
              variant="ghost"
              onPress={() => {
                clearDraft();
                setEdited(null);
              }}
            />
          </View>
        ) : null}
        <AppText variant="caption">
          {st.entered} entered · {st.absent} absent · {st.pending} to do
          {st.invalid ? ` · ${st.invalid} to fix` : ""}
        </AppText>
      </View>

      {lines.length === 0 ? (
        <EmptyState title="No students" message="No active students in this section." />
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(l) => String(l.studentId)}
          contentContainerClassName="gap-2 p-4 pb-36"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <MarksRow line={item} limits={limits} editable={editable} onChange={(p) => edit(item.studentId, p)} />}
        />
      )}

      {editable ? (
        <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {message ? (
            <AppText accessibilityRole="alert" className={cn("text-sm", message.tone === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {message.text}
            </AppText>
          ) : offline ? (
            <AppText variant="caption">You&apos;re offline. Your marks stay on this phone until you can save.</AppText>
          ) : st.changed ? (
            <AppText variant="caption">{st.changed} row(s) not saved yet.</AppText>
          ) : null}
          <Button title="Save marks" icon={Save} loading={save.isPending} disabled={offline || save.isPending || st.changed === 0} onPress={submit} fullWidth />
        </View>
      ) : null}
    </View>
  );
};

const MarkInput = ({ caption, label, value, error, editable, onChange, max }: { caption: string; label: string; value: string; error: string; editable: boolean; onChange: (v: string) => void; max: number }) => {
  const { colors } = useTheme();
  return (
    <View className="flex-1 gap-1">
      <AppText variant="caption">
        {caption} /{max}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        value={value}
        onChangeText={(v) => onChange(v.replace(",", "."))}
        editable={editable}
        keyboardType="decimal-pad"
        maxLength={6}
        placeholder="—"
        placeholderTextColor={colors.subtle}
        className={cn(
          "h-11 rounded-lg border px-3 text-base text-slate-900 dark:text-slate-100",
          error ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
          !editable && "opacity-60",
        )}
      />
      {error ? <AppText className="text-xs text-red-600 dark:text-red-400">{error}</AppText> : null}
    </View>
  );
};

const MarksRow = ({ line, limits, editable, onChange }: { line: MarksLine; limits: Limits; editable: boolean; onChange: (p: Partial<MarksLine>) => void }) => {
  const errors = lineErrors(line, limits);
  return (
    <View className={cn("gap-2 rounded-xl border bg-white p-3 dark:bg-slate-900", errors.theory || errors.practical ? "border-red-300 dark:border-red-800" : "border-slate-200 dark:border-slate-800")}>
      <View className="flex-row items-center justify-between gap-2">
        <AppText className="flex-1 font-medium" numberOfLines={1}>
          {line.rollNumber ? `${line.rollNumber}. ` : ""}
          {line.name}
        </AppText>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: line.isAbsent, disabled: !editable }}
          accessibilityLabel={`Absent, ${line.name}`}
          disabled={!editable}
          onPress={() => onChange({ isAbsent: !line.isAbsent })}
          className={cn("min-h-9 justify-center rounded-full border px-3", line.isAbsent ? "border-red-600 bg-red-600" : "border-slate-300 dark:border-slate-700")}
        >
          <AppText className={cn("text-sm font-semibold", line.isAbsent && "text-white")}>Absent</AppText>
        </Pressable>
      </View>
      {!line.isAbsent ? (
        <View className="flex-row gap-3">
          {limits.hasTheory ? (
            <MarkInput caption="Theory" label={`Theory, ${line.name}`} value={line.marksObtained} error={errors.theory} editable={editable} max={limits.theoryMax} onChange={(v) => onChange({ marksObtained: v })} />
          ) : null}
          {limits.hasPractical ? (
            <MarkInput caption="Practical" label={`Practical, ${line.name}`} value={line.practicalMarks} error={errors.practical} editable={editable} max={limits.practicalMax} onChange={(v) => onChange({ practicalMarks: v })} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};
