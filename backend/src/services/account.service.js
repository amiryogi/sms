/**
 * Sign-in details shared by every way an account is created or edited
 * (staff via /users and /auth/register, students, parents): the username and
 * the optional email. Controllers call these instead of checking by hand.
 */
const { ApiError } = require("../utils");
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

module.exports = { normalizeEmail, resolveUsername, assertEmailFree };
