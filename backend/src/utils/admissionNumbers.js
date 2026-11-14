/**
 * Numbers the system generates when the admin leaves the field empty: the
 * school's initials, a dash and a running number, e.g. SVI-0001 for
 * "Siddhartha Vanasthali Institute". One series per school, shared by students
 * (it is their admission number) and staff. Short on purpose: people sign in
 * with it (the username is the number in lower case).
 */
const DIGITS = 4;
const MAX_INITIALS = 6;
const SMALL_WORDS = new Set(["of", "the", "and", "for", "in", "at"]);

/** "Learning Secondary School" -> "LSS". A one-word name gives its first three letters. */
const schoolInitials = (schoolName) => {
  const words = String(schoolName ?? "")
    .replace(/['’]/g, "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const main = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  const used = main.length ? main : words;
  let initials = used.length === 1 ? used[0].slice(0, 3) : used.map((w) => w[0]).join("");
  initials = initials.toUpperCase().slice(0, MAX_INITIALS);
  return initials.length >= 2 ? initials : "STU";
};

/** What every generated number of the school starts with, e.g. "SVI-". */
const admissionPrefix = (schoolName) => `${schoolInitials(schoolName)}-`;

/**
 * The next free number.
 *   existing: admission numbers and usernames already used in the school (other shapes are ignored)
 *   prefix: from admissionPrefix()
 *   skip: how many numbers to jump over, for a retry after a clash
 */
const nextAdmissionNumber = (existing, prefix, skip = 0) => {
  let highest = 0;
  for (const value of existing || []) {
    const text = String(value ?? "").trim().toUpperCase();
    if (!text.startsWith(prefix)) continue;
    const rest = text.slice(prefix.length);
    if (!/^\d+$/.test(rest)) continue;
    highest = Math.max(highest, Number(rest));
  }
  return `${prefix}${String(highest + 1 + skip).padStart(DIGITS, "0")}`;
};

module.exports = { schoolInitials, admissionPrefix, nextAdmissionNumber };
