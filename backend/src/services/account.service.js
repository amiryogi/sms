/**
 * Sign-in details shared by every way an account is created or edited
 * (staff via /users and /auth/register, students, parents): the username and
 * the optional email. Controllers call these instead of checking by hand.
 */
const bcrypt = require("bcryptjs");
const { ApiError } = require("../utils");
const { generateTemporaryPassword } = require("../utils/passwords");
const { dialect } = require("../database");
const { normalizeUsername, usernameProblem, suggestUsername, uniqueUsername } = require("../utils/usernames");
const { admissionPrefix, nextAdmissionNumber } = require("../utils/admissionNumbers");

/** An optional email as stored: trimmed, lower case, null when empty. */
const normalizeEmail = (v) => {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s || null;
};

/**
 * The username to store for an account.
 *   requested: what the admin typed (may be empty)
 *   suggestion: input for suggestUsername ({ kind, admissionNumber, … }) when nothing was typed
 *   exceptUserId: the account being edited (its own name is not "taken")
 * A typed name that is taken is refused (409); a suggested one gets .2, .3 …
 */
const resolveUsername = async (db, schoolId, { requested, suggestion, exceptUserId } = {}) => {
  const wanted = normalizeUsername(requested);
  if (wanted) {
    const problem = usernameProblem(wanted);
    if (problem) throw ApiError.badRequest(problem);
    const clash = await db.user.findFirst({
      where: { schoolId, username: dialect.text.equals(wanted), ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict(`Username "${wanted}" is already taken`);
    return wanted;
  }
  if (!suggestion) throw ApiError.badRequest("Username is required");
  return uniqueUsername(db, schoolId, suggestUsername(suggestion));
};

/** Refuse an email another account of the school already uses (case-insensitive). */
const assertEmailFree = async (db, schoolId, email, exceptUserId) => {
  if (!email) return;
  const clash = await db.user.findFirst({
    where: { schoolId, email: dialect.text.equals(email), ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) },
    select: { id: true },
  });
  if (clash) throw ApiError.conflict("This email is already used by another account in this school");
};

// ---------- passwords an admin sets ----------

const BCRYPT_ROUNDS = 10;

/**
 * The password of a new account. An admin may type one; otherwise one is
 * generated. Either way the user must choose their own at the first sign-in.
 * Returns the hash to store and, when generated, the plain password to show
 * the admin once (it is never stored or logged).
 */
const initialPassword = async (typed) => {
  const plain = typed || generateTemporaryPassword();
  return {
    passwordHash: await bcrypt.hash(plain, BCRYPT_ROUNDS),
    mustChangePassword: true,
    temporaryPassword: typed ? null : plain,
  };
};

/**
 * Reset a password: the typed one or a generated one. Sets the "must change"
 * flag and ends every session of that user (their refresh tokens are deleted).
 * Returns the plain password, to show the admin once.
 */
const setTemporaryPassword = async (db, userId, typed) => {
  const plain = typed || generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  await db.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });
  await db.refreshToken.deleteMany({ where: { userId } });
  return plain;
};

/** One log line per password an admin sets (never the password itself). */
const logPasswordSet = (actor, target, how) =>
  console.info(`[account] ${how}: user ${target.id} (${target.username || "?"}) by user ${actor.id} at ${new Date().toISOString()}`);

/**
 * Create an account whose number the system chooses: the school's initials and
 * a running number (SVI-0001), one series for students and staff.
 *   create(number, username): does the insert. `number` is upper case (a
 *     student's admission number); `username` is `typedUsername`, or the number
 *     in lower case.
 * Unless a username was typed, two admins saving at once cannot get the same
 * number: the second insert fails on the unique username and is retried with
 * the next one.
 */
const createWithGeneratedNumber = async (db, schoolId, create, { typedUsername = null } = {}) => {
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const prefix = admissionPrefix(school?.name);

  for (let skip = 0; skip < 20; skip += 1) {
    const [students, users] = await Promise.all([
      db.student.findMany({ where: { schoolId, admissionNumber: { startsWith: prefix } }, select: { admissionNumber: true } }),
      db.user.findMany({ where: { schoolId, username: { startsWith: prefix.toLowerCase() } }, select: { username: true } }),
    ]);
    const used = [...students.map((s) => s.admissionNumber), ...users.map((u) => u.username)];
    const number = nextAdmissionNumber(used, prefix, skip);
    try {
      return await create(number, typedUsername || number.toLowerCase());
    } catch (error) {
      if (!typedUsername && dialect.isUniqueViolationOn(error, "username")) continue;
      throw error;
    }
  }
  throw ApiError.conflict("Could not choose a number. Type one and try again.");
};

/**
 * Create a staff account under the username the admin typed, or, when none was
 * typed, under a generated number (svi-0001).
 *   typedUsername: already checked with resolveUsername, or null
 *   create(username): does the insert
 */
const createWithSignInName = (db, schoolId, typedUsername, create) =>
  typedUsername ? create(typedUsername) : createWithGeneratedNumber(db, schoolId, (_number, username) => create(username));

module.exports = { createWithGeneratedNumber, createWithSignInName, normalizeEmail, resolveUsername, assertEmailFree, initialPassword, setTemporaryPassword, logPasswordSet, BCRYPT_ROUNDS };
