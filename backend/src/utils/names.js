/**
 * Person names. A user has a first and last name and an optional middle name
 * (Ram Bahadur Thapa). Every name the API builds for display goes through
 * fullName, so the middle name is never dropped in one place and kept in another.
 */

const part = (v) => (typeof v === "string" ? v.trim() : "");

/** "Ram Bahadur Thapa" from { firstName, middleName, lastName }; "" for nothing. */
const fullName = (person) => {
  if (!person) return "";
  return [person.firstName, person.middleName, person.lastName].map(part).filter(Boolean).join(" ");
};

/** A middle name as stored: trimmed, and null when empty. */
const normalizeMiddleName = (v) => {
  const s = part(v);
  return s ? s : null;
};

module.exports = { fullName, normalizeMiddleName };
