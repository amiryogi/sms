import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { useNetworkState } from "expo-network";
import { Lock, Save, UserX } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import { AppText, Badge, Button, cn, EmptyState, ErrorState, OfflineBanner, SkeletonList, TextInput } from "@/components/ui";
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
      <View className="flex-1 bg-canvas p-4">
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
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
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
          <View className="flex-row items-center gap-2 rounded-lg bg-sunken p-3">
            <Lock size={16} color={colors.muted} />
            <AppText className="flex-1 text-sm">This exam is {status?.toLowerCase()}. Marks can be changed only while it is published.</AppText>
          </View>
        ) : null}
        {restored ? (
          <View className="flex-row items-center justify-between gap-2 rounded-lg bg-warn-soft p-3">
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
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <AppText variant="label">
            <AppText className="font-extrabold text-ink">{st.entered}</AppText> entered
          </AppText>
          <AppText variant="label">
            <AppText className="font-extrabold text-ink">{st.absent}</AppText> absent
          </AppText>
          <AppText variant="label">
            <AppText className="font-extrabold text-ink">{st.pending}</AppText> to do
          </AppText>
          {st.invalid ? (
            <AppText variant="label" className="text-bad">
              <AppText className="font-extrabold text-bad">{st.invalid}</AppText> to fix
            </AppText>
          ) : null}
        </View>
      </View>

      {lines.length === 0 ? (
        <EmptyState title="No students" message="No active students in this section." />
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(l) => String(l.studentId)}
          contentContainerClassName="gap-3 p-4 pb-40"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <MarksRow line={item} limits={limits} editable={editable} onChange={(p) => edit(item.studentId, p)} />}
        />
      )}

      {editable ? (
        <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-line bg-surface p-4">
          {message ? (
            <AppText accessibilityRole="alert" className={cn("text-sm", message.tone === "success" ? "text-ok" : "text-bad")}>
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
    </KeyboardAvoidingView>
  );
};

const MarkInput = ({
  caption,
  label,
  value,
  error,
  editable,
  onChange,
  max,
}: {
  caption: string;
  label: string;
  value: string;
  error: string;
  editable: boolean;
  onChange: (v: string) => void;
  max: number;
}) => {
  const { colors } = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View className="flex-1 gap-1">
      <AppText variant="label">{caption}</AppText>
      {/* The whole box focuses the field; the "/ max" sits inside it, after the digits. */}
      <Pressable
        accessible={false}
        disabled={!editable}
        onPress={() => input.current?.focus()}
        className={cn(
          "min-h-14 flex-row items-center rounded-xl border-2 px-3",
          error ? "border-bad bg-bad-soft" : focused ? "border-brand-600 bg-surface" : "border-line-strong bg-surface",
          !editable && "border-line bg-sunken",
        )}
      >
        <TextInput
          ref={input}
          accessibilityLabel={`${label}, out of ${max}`}
          accessibilityHint={error || undefined}
          value={value}
          onChangeText={(v) => onChange(v.replace(",", "."))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={6}
          placeholder="–"
          placeholderTextColor={colors.subtle}
          style={{ fontVariant: ["tabular-nums"] }}
          className="min-w-0 flex-1 py-2 text-2xl font-bold text-ink"
        />
        <AppText className="text-base font-semibold text-ink-subtle">/ {max}</AppText>
      </Pressable>
      {error ? (
        <AppText accessibilityRole="alert" className="text-xs font-semibold text-bad">
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const MarksRow = ({ line, limits, editable, onChange }: { line: MarksLine; limits: Limits; editable: boolean; onChange: (p: Partial<MarksLine>) => void }) => {
  const errors = lineErrors(line, limits);
  const { colors } = useTheme();
  const hasError = !!(errors.theory || errors.practical);
  return (
    <View className={cn("gap-3 rounded-2xl border bg-surface p-4", hasError ? "border-bad/50" : "border-line")}>
      <View className="flex-row items-center gap-3">
        <View className="min-h-10 min-w-10 items-center justify-center rounded-lg bg-sunken px-1.5" accessibilityElementsHidden importantForAccessibility="no">
          <AppText className="text-sm font-bold text-ink-muted">{line.rollNumber ?? "–"}</AppText>
        </View>
        <AppText className="flex-1 text-base font-semibold" numberOfLines={2}>
          {line.name}
        </AppText>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: line.isAbsent, disabled: !editable }}
          accessibilityLabel={`Absent, ${line.name}`}
          disabled={!editable}
          hitSlop={4}
          onPress={() => onChange({ isAbsent: !line.isAbsent })}
          className={cn(
            "min-h-11 flex-row items-center gap-1.5 rounded-full border-2 px-3.5",
            line.isAbsent ? "border-bad bg-bad-soft" : "border-line-strong bg-surface",
            !editable && "opacity-60",
          )}
        >
          {line.isAbsent ? <UserX size={16} color={colors.bad} strokeWidth={2.4} /> : null}
          <AppText className={cn("text-sm font-bold", line.isAbsent ? "text-bad" : "text-ink-muted")}>Absent</AppText>
        </Pressable>
      </View>
      {line.isAbsent ? (
        <AppText variant="muted">Marked absent for this subject. Tap Absent again to enter marks.</AppText>
      ) : (
        <View className="flex-row gap-3">
          {limits.hasTheory ? (
            <MarkInput caption="Theory" label={`Theory, ${line.name}`} value={line.marksObtained} error={errors.theory} editable={editable} max={limits.theoryMax} onChange={(v) => onChange({ marksObtained: v })} />
          ) : null}
          {limits.hasPractical ? (
            <MarkInput caption="Practical" label={`Practical, ${line.name}`} value={line.practicalMarks} error={errors.practical} editable={editable} max={limits.practicalMax} onChange={(v) => onChange({ practicalMarks: v })} />
          ) : null}
        </View>
      )}
    </View>
  );
};
