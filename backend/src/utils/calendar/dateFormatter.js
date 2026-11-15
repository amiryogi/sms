/**
 * Names and formats for BS and AD dates, in English and Nepali. Pure: the
 * conversion itself is in bsDateAdapter.js. Mirrors
 * frontend/src/lib/calendar/dateFormatter.js.
 */
const { adToBs, isIsoDate, weekdayOf } = require("./bsDateAdapter");

// English spellings are the ones the app already prints (attendance, receipts).
const BS_MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const BS_MONTHS_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const AD_MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const AD_MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AD_MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_NE = ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];
const WEEKDAYS_SHORT_NE = ["आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि"];

const NEPALI_DIGITS = "०१२३४५६७८९";

/** "2083" -> "२०८३". */
const toNepaliDigits = (value) => String(value).replace(/[0-9]/g, (d) => NEPALI_DIGITS[d]);

/** "२०८३" -> "2083". */
const toLatinDigits = (value) => String(value).replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));

const digits = (value, numerals) => (numerals === "ne" ? toNepaliDigits(value) : String(value));
const pad = (n) => String(n).padStart(2, "0");

const bsMonthName = (month, language = "en") => (language === "ne" ? BS_MONTHS_NE : BS_MONTHS_EN)[month - 1] ?? "";
const adMonthName = (month, language = "en", short = false) =>
  (language === "ne" ? AD_MONTHS_NE : short ? AD_MONTHS_SHORT_EN : AD_MONTHS_EN)[month - 1] ?? "";
const weekdayName = (weekday, language = "en", short = false) =>
  (language === "ne" ? (short ? WEEKDAYS_SHORT_NE : WEEKDAYS_NE) : short ? WEEKDAYS_SHORT_EN : WEEKDAYS_EN)[weekday] ?? "";

/**
 * A BS date as text.
 *   style "long"    -> "1 Baisakh 2083" / "१ बैशाख २०८३"
 *   style "numeric" -> "2083/01/01"     / "२०८३/०१/०१"
 */
const formatBs = (bs, { language = "en", numerals = "en", style = "long" } = {}) => {
  if (!bs) return "";
  if (style === "numeric") return digits(`${bs.year}/${pad(bs.month)}/${pad(bs.day)}`, numerals);
  return `${digits(bs.day, numerals)} ${bsMonthName(bs.month, language)} ${digits(bs.year, numerals)}`;
};

/**
 * An AD "YYYY-MM-DD" date as text.
 *   style "long"    -> "14 Apr 2026"
 *   style "numeric" -> "2026-04-14"
 */
const formatAd = (iso, { language = "en", numerals = "en", style = "long" } = {}) => {
  if (!isIsoDate(iso)) return "";
  if (style === "numeric") return digits(iso, numerals);
  const [y, m, d] = iso.split("-").map(Number);
  return `${digits(d, numerals)} ${adMonthName(m, language, true)} ${digits(y, numerals)}`;
};

/** The BS text for an AD date ("" when it cannot be converted). */
const formatAdAsBs = (iso, options) => formatBs(adToBs(iso), options);

/** "Tuesday" for an AD date. */
const weekdayNameOf = (iso, language = "en", short = false) => {
  const w = weekdayOf(iso);
  return w === null ? "" : weekdayName(w, language, short);
};

module.exports = {
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  AD_MONTHS_EN,
  AD_MONTHS_SHORT_EN,
  AD_MONTHS_NE,
  WEEKDAYS_EN,
  WEEKDAYS_SHORT_EN,
  WEEKDAYS_NE,
  WEEKDAYS_SHORT_NE,
  toNepaliDigits,
  toLatinDigits,
  bsMonthName,
  adMonthName,
  weekdayName,
  weekdayNameOf,
  formatBs,
  formatAd,
  formatAdAsBs,
};
