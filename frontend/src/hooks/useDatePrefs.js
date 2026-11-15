import { useSyncExternalStore } from "react";
import { getDatePrefs, subscribeDatePrefs } from "../lib/calendar/datePrefs";

/**
 * The date preferences in force ({ calendar, language, numerals, weekStartsOn,
 * weeklyHolidayDays }); the component re-renders when they change.
 */
export const useDatePrefs = () => useSyncExternalStore(subscribeDatePrefs, getDatePrefs, getDatePrefs);
