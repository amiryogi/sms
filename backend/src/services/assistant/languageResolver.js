/**
 * Which language to answer in: English ("en") or Nepali ("ne").
 *
 * - A person's own choice (Auto, English, नेपाली) wins.
 * - On Auto, the question decides: any real share of Devanagari, including mixed
 *   "CAS assessment कसरी enter गर्ने?", means Nepali; so does Nepali written in Latin
 *   letters ("hajiri kasari garne?"). Everything else is English.
 * - With detection switched off by the school, Auto means the school's default language.
 */

const DEVANAGARI = /[ऀ-ॿ]/;
const LETTER = /\p{L}/u;

/** Common words of Nepali written in Latin letters, rare in English. */
const ROMAN_NEPALI = new Set(
  (
    "kasari garne garnu garna garnuhos garney garchha garcha gareko garera hernu herne herna hercha " +
    "kaha kata kun kati kina kasto ke ko ma lai bata sanga haru hamro mero timro tapai tapaiko " +
    "cha chha xa chaina chhaina ho hoina hunchha huncha hudaina parcha parchha chahincha chaincha " +
    "sakchu sakincha sakinchha milcha mildaina bhayo bhaena bhanne bhaneko pani ani ra " +
    "hajiri natija pariksha shulka bida bidyarthi vidyarthi shikshak sikshak suchana kaksha abhibhawak " +
    "thapne hataune khojne banaune pathaune chalaune dekhaucha dekhindaina"
  ).split(" ")
);

/** Words that are also common in English questions; never counted alone. */
const AMBIGUOUS = new Set(["ma", "ko", "ra", "ho", "ke", "ani", "cha", "kun", "lai"]);

/**
 * @param {string} text
 * @returns {{ language: "en"|"ne", script: "devanagari"|"latin"|"mixed"|"none", romanized: boolean }}
 */
function detectLanguage(text) {
  const chars = [...String(text || "")];
  const letters = chars.filter((c) => LETTER.test(c));
  const deva = letters.filter((c) => DEVANAGARI.test(c)).length;
  const latin = letters.length - deva;
  if (letters.length === 0) return { language: "en", script: "none", romanized: false };

  if (deva > 0 && deva / letters.length >= 0.1) {
    return { language: "ne", script: latin > 0 ? "mixed" : "devanagari", romanized: false };
  }

  const words = String(text).toLowerCase().match(/[a-z]+/g) || [];
  const hits = words.filter((w) => ROMAN_NEPALI.has(w));
  const strong = hits.filter((w) => !AMBIGUOUS.has(w)).length;
  if (strong >= 1 && (hits.length >= 2 || hits.length / words.length >= 0.25)) {
    return { language: "ne", script: "latin", romanized: true };
  }
  return { language: "en", script: deva ? "mixed" : "latin", romanized: false };
}

/**
 * @param {object} opts
 * @param {"auto"|"en"|"ne"|undefined} opts.preference  the person's choice, sent with each request
 * @param {string} opts.message
 * @param {object} opts.settings  normalized school settings (defaultLanguage, autoDetect)
 * @returns {{ language: "en"|"ne", detected: object|null, source: "preference"|"detected"|"school" }}
 */
function resolveLanguage({ preference, message, settings }) {
  if (preference === "en" || preference === "ne") return { language: preference, detected: null, source: "preference" };
  const schoolDefault = settings?.defaultLanguage === "en" || settings?.defaultLanguage === "ne" ? settings.defaultLanguage : null;
  // No personal choice yet: the school's default language, when it set one.
  if (!preference && schoolDefault) return { language: schoolDefault, detected: null, source: "school" };
  // Auto: detect, unless the school switched detection off.
  if (settings?.autoDetect === false) return { language: schoolDefault || "en", detected: null, source: "school" };
  const detected = detectLanguage(message);
  return { language: detected.language, detected, source: "detected" };
}

/** The language rule placed in the system prompt. */
function languageInstruction(language, { romanized = false } = {}) {
  if (language === "ne") {
    return [
      "Write the answer in natural, simple Nepali (Devanagari script), the way a helpful school office assistant would speak.",
      "The user may mix Nepali and English words; that is normal.",
      romanized ? "The user wrote Nepali in Latin letters; still answer in Devanagari." : "",
      "Keep every menu name, page title, button and field label exactly as written in English in the documents, in bold (for example **Save Attendance**). Do not translate them. You may add a short Nepali explanation in brackets after a label.",
      "Keep numbers, paths like /teacher/attendance and codes as they are.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return "Write the answer in clear, simple English.";
}

module.exports = { detectLanguage, resolveLanguage, languageInstruction };
