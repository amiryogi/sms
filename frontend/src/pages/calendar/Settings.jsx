import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Alert, Button, Card, CardHeader, Field, LoadingBlock, PageHeader, SelectInput, Switch, confirmDialog, toast } from "../../components/ui";
import { calendarService } from "../../api/calendarService";
import { useAuth } from "../../context/AuthContext";
import { CALENDAR_OPTIONS, LANGUAGE_OPTIONS, NUMERAL_OPTIONS, WEEKDAYS_EN, WEEKDAYS_NE } from "../../lib/calendar/calendarConstants";
import { formatByPrefs } from "../../lib/calendar/dateFormatter";
import { clearPersonalDatePrefs, getPersonalDatePrefs } from "../../lib/calendar/datePrefs";
import { todayAd } from "../../utils/format";
import { cn } from "../../lib/cn";

/**
 * Calendar -> Calendar Settings (admin): how dates are shown by default, which
 * weekdays the school is closed, and whether attendance is refused on a
 * non-working day. Each person can still choose BS or AD for themselves from
 * the menu under their name.
 */
const CalendarSettings = () => {
  const { refreshUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasPersonal, setHasPersonal] = useState(() => Object.keys(getPersonalDatePrefs()).length > 0);

  useEffect(() => {
    calendarService
      .getSettings()
      .then((res) => {
        setConfig(res.data.config);
        setIsCustom(res.data.isCustom);
      })
      .catch(() => toast.error("Could not load the calendar settings"));
  }, []);

  if (!config) return <LoadingBlock text="Loading settings…" />;

  const set = (patch) => setConfig((prev) => ({ ...prev, ...patch }));
  const toggleDay = (day) => {
    const has = config.weeklyHolidayDays.includes(day);
    const next = has ? config.weeklyHolidayDays.filter((d) => d !== day) : [...config.weeklyHolidayDays, day].sort((a, b) => a - b);
    if (next.length >= 7) {
      toast.error("At least one day of the week must be a working day");
      return;
    }
    set({ weeklyHolidayDays: next });
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await calendarService.updateSettings(config);
      setConfig(res.data.config);
      setIsCustom(true);
      await refreshUser?.();
      toast.success("Calendar settings saved");
    } catch (error) {
      const list = error.response?.data?.errors || [];
      setErrors(Object.fromEntries(list.map((e) => [e.field, e.message])));
      toast.error(error.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirmDialog({
      title: "Reset the calendar settings?",
      message: "Dates go back to B.S., Saturday becomes the only weekly holiday, and attendance is refused on non-working days.",
      confirmLabel: "Reset",
    });
    if (!ok) return;
    try {
      const res = await calendarService.resetSettings();
      setConfig(res.data.config);
      setIsCustom(false);
      await refreshUser?.();
      toast.success("Settings reset");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset");
    }
  };

  const sample = formatByPrefs(todayAd(), { calendar: config.defaultCalendar, language: config.defaultLanguage, numerals: config.defaultNumerals });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Calendar Settings" description="Applies to everyone in the school." icon={Settings2} />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Weekly holidays" description="The days of the week the school is closed. They are shown in red and no attendance is taken." />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="group" aria-label="Weekly holidays">
            {WEEKDAYS_EN.map((name, day) => {
              const on = config.weeklyHolidayDays.includes(day);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "cursor-pointer rounded-xl border px-2 py-2.5 text-center text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-600",
                    on ? "border-red-300 bg-red-50 font-semibold text-red-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  {name}
                  <span className="block text-xs font-normal opacity-80">{WEEKDAYS_NE[day]}</span>
                  <span className="mt-1 block text-[11px] font-medium">{on ? "Holiday" : "Working day"}</span>
                </button>
              );
            })}
          </div>
          {errors.weeklyHolidayDays && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{errors.weeklyHolidayDays}</p>}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Switch
              id="cal-block"
              checked={config.blockAttendanceOnNonWorkingDays}
              onChange={(v) => set({ blockAttendanceOnNonWorkingDays: v })}
              label="No attendance on holidays"
              description="Refuse the register on weekly holidays and on holidays that apply to the class. Switch off if the school sometimes holds classes on a holiday. Attendance already saved is never changed."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="How dates are shown" description="The school's default. Each person can choose differently from the menu under their name." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Calendar" htmlFor="cal-default" error={errors.defaultCalendar}>
              <SelectInput id="cal-default" value={config.defaultCalendar} onChange={(e) => set({ defaultCalendar: e.target.value })}>
                {CALENDAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Week starts on" htmlFor="cal-week" error={errors.weekStartsOn}>
              <SelectInput id="cal-week" value={config.weekStartsOn} onChange={(e) => set({ weekStartsOn: Number(e.target.value) })}>
                {WEEKDAYS_EN.map((name, day) => (
                  <option key={name} value={day}>{name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Month and weekday names" htmlFor="cal-lang" error={errors.defaultLanguage}>
              <SelectInput id="cal-lang" value={config.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}>
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Numerals" htmlFor="cal-num" error={errors.defaultNumerals}>
              <SelectInput id="cal-num" value={config.defaultNumerals} onChange={(e) => set({ defaultNumerals: e.target.value })}>
                {NUMERAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Today will read: <span className="font-semibold text-slate-900" data-testid="date-sample">{sample}</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">Dates are always stored in A.D.; this only changes how they are shown. Time zone: {config.timezone}.</p>
        </Card>

        {hasPersonal && (
          <Alert
            tone="info"
            title="You have your own date setting on this browser"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  clearPersonalDatePrefs();
                  setHasPersonal(false);
                }}
              >
                Use the school's
              </Button>
            }
          >
            So this page may look different to you than to others until you clear it.
          </Alert>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {isCustom && <Button variant="ghost" onClick={reset}>Reset to defaults</Button>}
          <Button onClick={save} loading={saving}>Save settings</Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettings;
