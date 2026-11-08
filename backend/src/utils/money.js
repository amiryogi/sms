/**
 * Exact money arithmetic for the fee ledger.
 *
 * Uses Prisma's Decimal (decimal.js, already a dependency of @prisma/client),
 * never JavaScript floats: 0.1 + 0.2 must be 0.30, not 0.30000000000000004.
 * Every function accepts a Decimal, a number or a numeric string and returns a
 * Decimal, except toNumber / toFixed2, which are for API responses only.
 */
const { Prisma } = require("@prisma/client");

const Decimal = Prisma.Decimal;

/** Any numeric input (or null/undefined, read as 0) as a Decimal. */
const dec = (value) => {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value);
};

/** Rounded to paisa (2 places, half up). */
const money = (value) => dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

const add = (...values) => values.reduce((acc, v) => acc.plus(dec(v)), new Decimal(0));
const sub = (a, b) => dec(a).minus(dec(b));
const sum = (items, pick = (x) => x) => items.reduce((acc, item) => acc.plus(dec(pick(item))), new Decimal(0));
const min = (a, b) => Decimal.min(dec(a), dec(b));
const max = (a, b) => Decimal.max(dec(a), dec(b));

const isZero = (v) => dec(v).isZero();
const isPositive = (v) => dec(v).greaterThan(0);
const isNegative = (v) => dec(v).lessThan(0);
/** -1, 0 or 1. */
const cmp = (a, b) => dec(a).comparedTo(dec(b));

/** True when the value has no more than 2 decimal places (no fractions of a paisa). */
const hasAtMostTwoDecimals = (v) => {
  try {
    return dec(v).decimalPlaces() <= 2;
  } catch {
    return false;
  }
};

/** For JSON responses: a plain number rounded to 2 places. */
const toNumber = (v) => Number(money(v).toFixed(2));
/** For CSV and receipts: "1234.50". */
const toFixed2 = (v) => money(v).toFixed(2);

module.exports = {
  Decimal,
  dec,
  money,
  add,
  sub,
  sum,
  min,
  max,
  isZero,
  isPositive,
  isNegative,
  cmp,
  hasAtMostTwoDecimals,
  toNumber,
  toFixed2,
};
