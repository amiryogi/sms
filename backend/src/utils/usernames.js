/**
 * Usernames: how people sign in when they have no email (most students and
 * parents). Unique per school, stored lower case, compared case-insensitively.
 *
 *   students -> their admission number            (stu20240001)
 *   parents  -> "p." + their child's number       (p.stu20240001)
 *   staff    -> the part of the email before "@"  (teacher1), else first.last
 *
 * The same defaults were backfilled by migration 20261113100000_usernames.
 * A username never contains "@", so a sign-in name with "@" is always an email.
 */

const MIN = 3;
const MAX = 50;
const PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/** Trim and lower-case; null for nothing. */
const normalizeUsername = (v) => {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s || null;
};

/** null when valid, otherwise the reason (for the validator's message). */
const usernameProblem = (v) => {
  const s = normalizeUsername(v);
  if (!s) return "Username is required";
  if (s.length < MIN || s.length > MAX) return `Username must be ${MIN} to ${MAX} characters`;
  if (!PATTERN.test(s)) return "Use letters, digits, dot, dash or underscore, starting with a letter or digit";
  return null;
};

/** Reduce any text to the allowed characters (for suggestions). */
const slug = (v) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, MAX - 5); // room for a ".12" suffix

/**
 * The default username for a new account.
 *   kind: "student" | "parent" | "staff"
 */
const suggestUsername = ({ kind, admissionNumber, childAdmissionNumber, email, firstName, lastName }) => {
  let base = "";
  if (kind === "student") base = slug(admissionNumber);
  else if (kind === "parent" && childAdmissionNumber) base = slug(`p.${childAdmissionNumber}`);
  if (!base && email) base = slug(String(email).split("@")[0]);
  if (!base) base = slug([firstName, lastName].filter(Boolean).join("."));
  if (!base) base = "user";
  if (base.length < MIN) base = base.padEnd(MIN, "0");
  return base;
};

/**
 * `base`, or base.2, base.3 … — the first one not taken in the school.
 * `db` is prisma or a transaction client.
 */
const uniqueUsername = async (db, schoolId, base) => {
  const taken = new Set(
    (
      await db.user.findMany({
        where: { schoolId, username: { startsWith: base } },
        select: { username: true },
      })
    ).map((u) => u.username),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 10000; n += 1) {
    const candidate = `${base}.${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("No free username"); // unreachable in practice
};

/** A sign-in name: an email when it contains "@", otherwise a username. */
const parseIdentifier = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return s.includes("@") ? { kind: "email", value: s.toLowerCase() } : { kind: "username", value: s.toLowerCase() };
};

module.exports = { normalizeUsername, usernameProblem, suggestUsername, uniqueUsername, parseIdentifier, USERNAME_MAX: MAX };
