import { useMemo, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { WebView } from "react-native-webview";
import { Printer, Share2 } from "lucide-react-native";
import { AppText, Badge, Button, Card, QueryView, Screen, SectionHeader, SegmentedControl } from "@/components/ui";
import { useReportCard } from "@/features/portal/hooks";
import { SubjectRow } from "@/features/portal/ResultsView";
import type { ReportCard } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assets";
import { formatPercent } from "@/utils/format";
import { reportCardHtml } from "./html/document";
import { printReportCard, shareReportCard } from "./pdf";

type View_ = "summary" | "sheet";

/**
 * One published report card. "Summary" is the phone-sized view; "Sheet" is
 * the school's printed layout (same template and stylesheet as the web), which
 * Share and Print turn into an A4 PDF. Unpublished cards never reach here: the
 * API answers 403 to students and parents.
 */
export const ReportCardScreen = ({ studentId, examId }: { studentId: number; examId: number }) => {
  const query = useReportCard(studentId, examId);
  const [view, setView] = useState<View_>("summary");
  return (
    <Screen scroll={view === "summary"} onRefresh={view === "summary" ? () => query.refetch() : undefined} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "Report card" }} />
      <QueryView query={query}>
        {(card) => (
          <>
            <View className={view === "sheet" ? "px-4 pt-4" : undefined}>
              <SegmentedControl<View_>
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: "summary", label: "Summary" },
                  { value: "sheet", label: "Printed sheet" },
                ]}
              />
              <Actions card={card} />
            </View>
            {view === "summary" ? <Summary card={card} /> : <Sheet card={card} />}
          </>
        )}
      </QueryView>
    </Screen>
  );
};

const Actions = ({ card }: { card: ReportCard }) => {
  const [busy, setBusy] = useState<"share" | "print" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (kind: "share" | "print") => {
    setBusy(kind);
    setError(null);
    try {
      await (kind === "share" ? shareReportCard(card) : printReportCard(card));
    } catch (e) {
      setError((e as Error).message || "Couldn't make the PDF.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <View className="my-3 gap-2">
      <View className="flex-row gap-2">
        <Button title="Share PDF" icon={Share2} className="flex-1" loading={busy === "share"} disabled={busy !== null} onPress={() => run("share")} />
        <Button title="Print" icon={Printer} variant="secondary" className="flex-1" loading={busy === "print"} disabled={busy !== null} onPress={() => run("print")} />
      </View>
      {error ? <AppText className="text-sm text-red-600 dark:text-red-400">{error}</AppText> : null}
    </View>
  );
};

const Summary = ({ card }: { card: ReportCard }) => {
  const s = card.summary;
  return (
    <>
      <Card className="gap-1">
        <AppText variant="heading">{card.student.name}</AppText>
        <AppText variant="muted">
          {card.examination.name} · {card.student.class} {card.student.section}
          {card.student.rollNumber ? ` · Roll ${card.student.rollNumber}` : ""}
        </AppText>
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Badge label={`GPA ${typeof s.gpa === "number" ? s.gpa.toFixed(2) : "—"}`} tone="brand" />
          <Badge label={`Grade ${s.grade ?? "—"}`} tone="neutral" />
          {card.layout.showPercentage || card.layout.template === "nebGradeSheet" ? <Badge label={formatPercent(s.percentage)} tone="neutral" /> : null}
          {s.classRank ? <Badge label={`Rank ${s.classRank}`} tone="neutral" /> : null}
          <Badge label={s.isPassed ? "Passed" : "Not passed"} tone={s.isPassed ? "success" : "danger"} />
        </View>
        {s.attendanceTotal ? (
          <AppText variant="caption" className="mt-1">
            Attendance {s.attendancePresent ?? "—"} / {s.attendanceTotal}
          </AppText>
        ) : null}
      </Card>
      <SectionHeader title="Subjects" />
      <View className="gap-2">
        {card.subjects.map((sub) => (
          <SubjectRow key={sub.subjectId} sub={sub} />
        ))}
      </View>
      {card.remarks.teacher || card.remarks.principal ? (
        <>
          <SectionHeader title="Remarks" />
          <Card className="gap-2">
            {card.remarks.teacher ? <AppText>Class teacher: {card.remarks.teacher}</AppText> : null}
            {card.remarks.principal ? <AppText>Principal: {card.remarks.principal}</AppText> : null}
          </Card>
        </>
      ) : null}
      <AppText variant="caption" className="mt-4">
        Graded on {card.meta.gradeScale}. Issued {card.meta.issueDateBS ?? ""}.
      </AppText>
    </>
  );
};

/** The printed layout, zoomed to the screen width. The logo loads from the school server. */
const Sheet = ({ card }: { card: ReportCard }) => {
  const html = useMemo(() => reportCardHtml(card, { logoSrc: resolveAssetUrl(card.school.logoUrl ?? card.school.bannerUrl) }), [card]);
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      scalesPageToFit
      javaScriptEnabled
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      accessibilityLabel="Report card as printed"
      // The sheet is a local document: never follow a link out of it.
      onShouldStartLoadWithRequest={(req) => req.url === "about:blank" || req.url.startsWith("data:")}
      setSupportMultipleWindows={false}
    />
  );
};
