/**
 * Password policy and temporary passwords.
 *
 * Policy (for passwords people choose and ones an admin types): at least 8
 * characters with an upper-case letter, a lower-case letter and a digit.
 *
 * A temporary password is what an admin hands out when creating an account or
 * resetting one. It meets the policy, avoids characters people misread on a
 * printed slip (0/O, 1/l/I), and the account must choose a new password at the
 * next sign-in (users.must_change_password).
 */
const { randomInt } = require("node:crypto");

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const POLICY_MESSAGE = "Use at least 8 characters with an upper-case letter, a lower-case letter and a number";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l, o
const DIGITS = "23456789"; // no 0, 1
const ALL = UPPER + LOWER + DIGITS;
const LENGTH = 10;

const pick = (set) => set[randomInt(set.length)];

/** A random password that meets the policy, e.g. "Hk7mPq3wXa". */
const generateTemporaryPassword = () => {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < LENGTH) chars.push(pick(ALL));
  // Fisher–Yates, so the guaranteed characters are not always first
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

const meetsPolicy = (v) => typeof v === "string" && POLICY.test(v);

module.exports = { generateTemporaryPassword, meetsPolicy, PASSWORD_POLICY: POLICY, PASSWORD_POLICY_MESSAGE: POLICY_MESSAGE };
