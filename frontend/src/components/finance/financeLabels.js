/**
 * Display helpers for the fee screens. Money is only *shown* here; every
 * balance and total comes from the backend ledger. The paisa helpers are for
 * form arithmetic (what the user is typing) and previews, never for truth.
 */

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "wallet", label: "Mobile wallet (eSewa, Khalti…)" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];
export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label.replace(/ \(.*\)$/, "") || m || "—";

export const FEE_STATUS = {
  paid: { tone: "success", label: "Paid" },
  partial: { tone: "warning", label: "Partly paid" },
  pending: { tone: "neutral", label: "Unpaid" },
  overdue: { tone: "danger", label: "Overdue" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  none: { tone: "neutral", label: "No fees" },
};

export const APPROVAL_STATUS = {
  PENDING: { tone: "warning", label: "Awaiting approval" },
  APPROVED: { tone: "success", label: "Approved" },
  REJECTED: { tone: "neutral", label: "Rejected" },
  REVOKED: { tone: "neutral", label: "Revoked" },
};

export const REVERSAL_CATEGORIES = [
  { value: "CORRECTION", label: "Correction (entered by mistake)" },
  { value: "REFUND", label: "Refund (money handed back)" },
];

/** "1234.5" / 1234.5 -> 123450 (integer paisa); NaN for bad input. */
export const toPaisa = (value) => {
  const s = String(value ?? "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  const [r, p = ""] = s.split(".");
  return Number(r) * 100 + Number((p + "00").slice(0, 2));
};
export const fromPaisa = (paisa) => (paisa / 100).toFixed(2);
export const isMoneyInput = (value) => Number.isFinite(toPaisa(value)) && toPaisa(value) > 0;

export const fullName = (user) => `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

// ---------- amount in words (Nepali / Indian grouping: thousand, lakh, crore) ----------

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const belowThousand = (n) => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
};

const wholeInWords = (n) => {
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${wholeInWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ");
};

/** 3550.5 -> "Rupees Three Thousand Five Hundred Fifty and Fifty Paisa Only". */
export const amountInWords = (amount) => {
  const paisa = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paisa) || paisa < 0) return "";
  const rupees = Math.floor(paisa / 100);
  const p = paisa % 100;
  return `Rupees ${wholeInWords(rupees)}${p ? ` and ${belowHundred(p)} Paisa` : ""} Only`;
};
