import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { AppText } from "./primitives";

/**
 * A small vertical bar chart drawn with react-native-svg (already a
 * dependency), for the finance dashboard. Values come from the API; the chart
 * only scales them. Screen readers get a text summary of every bar.
 */
export const BarChart = ({
  data,
  height = 140,
  format = String,
  label,
}: {
  data: { key: string; label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  label: string;
}) => {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const gap = 6;
  const summary = data.map((d) => `${d.label}: ${format(d.value)}`).join("; ");
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${label}. ${summary}`}>
      <Svg width="100%" height={height} viewBox={`0 0 ${n * 40} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4);
          return <Rect key={d.key} x={i * 40 + gap / 2} y={height - h} width={40 - gap} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={4} fill={colors.brand} />;
        })}
      </Svg>
      <View className="mt-1 flex-row">
        {data.map((d) => (
          <AppText key={d.key} variant="caption" numberOfLines={1} className="flex-1 text-center">
            {d.label}
          </AppText>
        ))}
      </View>
    </View>
  );
};

/** Horizontal progress bars with values, for breakdowns by class or fee type. */
export const BreakdownBars = ({ rows, format }: { rows: { key: string | number; label: string; value: number; total: number }[]; format: (v: number) => string }) => {
  const { colors } = useTheme();
  return (
    <View className="gap-3">
      {rows.map((r) => {
        const pct = r.total > 0 ? Math.min(100, (r.value / r.total) * 100) : 0;
        return (
          <View key={r.key} accessible accessibilityLabel={`${r.label}: ${format(r.value)} of ${format(r.total)}`} className="gap-1">
            <View className="flex-row justify-between">
              <AppText className="text-sm font-medium">{r.label}</AppText>
              <AppText variant="caption">
                {format(r.value)} / {format(r.total)}
              </AppText>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-sunken">
              <View style={{ width: `${pct}%`, backgroundColor: colors.brand }} className="h-full rounded-full" />
            </View>
          </View>
        );
      })}
    </View>
  );
};
