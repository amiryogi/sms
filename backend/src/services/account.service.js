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

module.exports = { normalizeEmail, resolveUsername, assertEmailFree, initialPassword, setTemporaryPassword, logPasswordSet, BCRYPT_ROUNDS };
