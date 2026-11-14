import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, X } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { formatAd } from "@/utils/format";
import { formatBs } from "@/utils/nepaliDate";
import { cn } from "./cn";
import { AppText, Button, IconButton } from "./primitives";

/** "YYYY-MM-DD" <-> a local Date at noon (no timezone edge cases). */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
};
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const asUtc = (iso: string) => `${iso}T00:00:00.000Z`;

/**
 * A date as the school reads it: BS first, AD alongside. The value is an AD
 * "YYYY-MM-DD" string (what the API takes); BS is display only.
 */
export const DateField = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  optional,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  minimumDate?: string;
  maximumDate?: string;
  /** Shows a clear button. */
  optional?: boolean;
  className?: string;
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
      if (event.type === "set" && date) onChange(toIso(date));
    } else if (date) {
      setPending(toIso(date));
    }
  };

  const picker = (
    <DateTimePicker
      value={toDate(pending ?? value ?? toIso(new Date()))}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : "default"}
      onChange={onPick}
      minimumDate={minimumDate ? toDate(minimumDate) : undefined}
      maximumDate={maximumDate ? toDate(maximumDate) : undefined}
    />
  );

  return (
    <View className={cn("gap-1.5", className)}>
      <AppText variant="label">{label}</AppText>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatBs(asUtc(value)) : "not set"}. Change`}
          onPress={() => {
            setPending(null);
            setOpen(true);
          }}
          className="min-h-12 flex-1 flex-row items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <CalendarDays size={18} color={colors.muted} />
          {value ? (
            <View>
              <AppText className="text-base">{formatBs(asUtc(value))}</AppText>
              <AppText variant="caption">{formatAd(asUtc(value))}</AppText>
            </View>
          ) : (
            <AppText variant="muted">Choose a date</AppText>
          )}
        </Pressable>
        {optional && value ? <IconButton icon={X} label={`Clear ${label}`} onPress={() => onChange(null)} /> : null}
      </View>

      {open && Platform.OS === "android" ? picker : null}
      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="gap-3 rounded-t-2xl bg-white p-4 pb-8 dark:bg-slate-900">
              {picker}
              <Button
                title="Done"
                onPress={() => {
                  onChange(pending ?? value ?? toIso(new Date()));
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};
