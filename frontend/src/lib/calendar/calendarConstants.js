/**
 * Names used by the calendar: months and weekdays in English and Nepali,
 * numerals, and the event categories with their labels and colours.
 */

// English spellings are the ones the app already prints (attendance, receipts).
export const BS_MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
export const BS_MONTHS_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
export const AD_MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const AD_MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const AD_MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_NE = ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];
export const WEEKDAYS_SHORT_NE = ["आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि"];

export const NEPALI_DIGITS = "०१२३४५६७८९";

export const CALENDAR_OPTIONS = [
  { value: "bs", label: "B.S. only" },
  { value: "ad", label: "A.D. only" },
  { value: "both", label: "B.S. with A.D." },
];
export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ne", label: "नेपाली" },
];
export const NUMERAL_OPTIONS = [
  { value: "en", label: "0-9" },
  { value: "ne", label: "०-९" },
];

/**
 * Event categories. `dot` and `chip` are complete Tailwind class names (kept
 * whole so the compiler sees them). Holidays are red, like on a wall calendar.
 */
export const CATEGORIES = {
  PUBLIC_HOLIDAY: { label: "Public holiday", dot: "bg-red-500", chip: "bg-red-50 text-red-700 ring-red-200", holiday: true },
  LOCAL_HOLIDAY: { label: "Local holiday", dot: "bg-rose-400", chip: "bg-rose-50 text-rose-700 ring-rose-200", holiday: true },
  SCHOOL_HOLIDAY: { label: "School holiday", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700 ring-orange-200", holiday: true },
  EXAMINATION: { label: "Examination", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  PARENT_TEACHER_MEETING: { label: "Parent-teacher meeting", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  SCHOOL_EVENT: { label: "School event", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  SPORTS_EVENT: { label: "Sports event", dot: "bg-lime-500", chip: "bg-lime-50 text-lime-800 ring-lime-200" },
  ADMISSION_DEADLINE: { label: "Admission deadline", dot: "bg-fuchsia-500", chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200" },
  FEE_DEADLINE: { label: "Fee deadline", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  ASSIGNMENT_DEADLINE: { label: "Assignment deadline", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 ring-blue-200" },
  ACADEMIC_ACTIVITY: { label: "Academic activity", dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700 ring-teal-200" },
  STAFF_MEETING: { label: "Staff meeting", dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
  OTHER: { label: "Other", dot: "bg-slate-400", chip: "bg-slate-50 text-slate-600 ring-slate-200" },
};

export const categoryMeta = (category) => CATEGORIES[category] || CATEGORIES.OTHER;

export const RECURRENCE_OPTIONS = [
  { value: "NONE", label: "Does not repeat" },
  { value: "WEEKLY", label: "Every week" },
  { value: "MONTHLY_BS", label: "Every month, same B.S. day" },
  { value: "YEARLY_BS", label: "Every year, same B.S. date" },
  { value: "YEARLY_AD", label: "Every year, same A.D. date" },
];

export const ROLE_LABELS = {
  ADMIN: "Administrators",
  TEACHER: "Teachers",
  EXAM_OFFICER: "Exam officers",
  ACCOUNTANT: "Accountants",
  STUDENT: "Students",
  PARENT: "Parents",
};

/** What each feed source is called in the legend and filters. */
export const SOURCE_LABELS = {
  event: "School events",
  exam: "Exams",
  examSubject: "Exams",
  assignment: "Assignments",
  fee: "Fees",
  notice: "Notices",
  academicYear: "Academic year",
};
