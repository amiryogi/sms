/**
 * The help documents the assistant answers from, and the search over them.
 *
 * Documents are Markdown files in src/data/assistant/knowledge/<folder>/*.md with front matter:
 *   id, title, roles [..], modules [..], routes [..], guides [..], status, aliases [..],
 *   verifiedAgainst [..], verifiedOn
 * (guide: docs/ai-assistant/knowledge-base-guide.md).
 *
 * Search is a small in-memory BM25 over the documents' sections:
 *  1. **Role filter first.** Only `status: published` documents whose `roles` include one of
 *     the user's roles are searched at all; SUPER_ADMIN also reads ADMIN documents. A student
 *     or parent can never retrieve an administrator's document.
 *  2. Query words are expanded with a Nepali / romanized-Nepali → English synonym map, so
 *     "हाजिरी कसरी गर्ने" finds the attendance guide.
 *  3. A document's title and aliases count extra; the page the user is on adds a small boost.
 *
 * The documents are written by the school's developers, but the prompt still treats them as
 * reference data, never as instructions.
 */
const fs = require("fs");
const path = require("path");

const KNOWLEDGE_DIR = path.join(__dirname, "../../data/assistant/knowledge");

/* ----------------------------------------------------------------- parsing */

/** Minimal front matter: `key: value` and `key: [a, b, c]` lines. */
function parseFrontMatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { meta: null, body: source };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^([A-Za-z][\w]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    meta[key] = value.startsWith("[") && value.endsWith("]")
      ? value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean)
      : value;
  }
  return { meta, body: match[2] };
}

/** Split a body into sections at "## " headings (the "# " title line is dropped). */
function sectionsOf(body) {
  const out = [];
  let current = { heading: "", lines: [] };
  for (const line of body.split(/\r?\n/)) {
    if (/^#\s/.test(line)) continue;
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      if (current.lines.join("").trim()) out.push(current);
      current = { heading: h[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join("").trim()) out.push(current);
  return out.map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }));
}

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function loadDocuments(dir = KNOWLEDGE_DIR) {
  const docs = [];
  for (const folder of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const file of fs.readdirSync(path.join(dir, folder.name))) {
      if (!file.endsWith(".md")) continue;
      const full = path.join(dir, folder.name, file);
      const { meta, body } = parseFrontMatter(fs.readFileSync(full, "utf8"));
      if (!meta?.id) continue;
      docs.push({
        id: meta.id,
        title: meta.title || meta.id,
        roles: asList(meta.roles),
        modules: asList(meta.modules),
        routes: asList(meta.routes),
        guides: asList(meta.guides),
        aliases: asList(meta.aliases),
        status: meta.status || "draft",
        verifiedAgainst: asList(meta.verifiedAgainst),
        verifiedOn: meta.verifiedOn || null,
        file: `${folder.name}/${file}`,
        body: body.trim(),
        sections: sectionsOf(body),
      });
    }
  }
  return docs.sort((a, b) => a.id.localeCompare(b.id));
}

/* -------------------------------------------------------------- tokenizing */

const STOP = new Set(
  (
    "a an and are as at be by can do does for from how i in is it me my of on or the this to what when where which who why will with you your " +
    "please want need show tell get see find use using there their them they we our us its was were has have had into about " +
    "को का की मा र छ छन् हो गर्ने गर्न गर्नु कसरी के कहाँ कुन मेरो हाम्रो लाई बाट पनि भने त्यो यो"
  ).split(" ")
);

/** Nepali (Devanagari and Latin) and loose English words → the words the documents use. */
const SYNONYMS = {
  हाजिरी: ["attendance", "register"], हाजिर: ["attendance", "present"], उपस्थिति: ["attendance"], उपस्थित: ["present", "attendance"], अनुपस्थित: ["absent", "attendance"],
  hajiri: ["attendance"], hajir: ["attendance"], upasthiti: ["attendance"],
  शुल्क: ["fee", "fees"], फी: ["fee", "fees"], शुल्कको: ["fee"], shulka: ["fee"], fi: ["fee"],
  owe: ["outstanding", "balance", "due"], owes: ["outstanding", "balance", "due"], owed: ["outstanding", "balance"], unpaid: ["outstanding", "unpaid"],
  भुक्तानी: ["payment"], रसिद: ["receipt"], बिल: ["bill"], बाँकी: ["outstanding", "balance", "due"], बक्यौता: ["outstanding", "due"], छुट: ["discount"], छात्रवृत्ति: ["scholarship"],
  नतिजा: ["result", "results"], परीक्षाफल: ["result", "results"], natija: ["result"], result: ["results"],
  परीक्षा: ["exam", "examination"], परिक्षा: ["exam"], pariksha: ["exam"], examination: ["exam"],
  अंक: ["marks"], अङ्क: ["marks"], नम्बर: ["marks", "number"], प्राप्ताङ्क: ["marks"], ank: ["marks"], number: ["marks"],
  ग्रेड: ["grade"], मार्कसिट: ["report", "card", "marksheet"], marksheet: ["report", "card"], gradesheet: ["report", "card"],
  रिपोर्ट: ["report"], कार्ड: ["card"], प्रिन्ट: ["print"],
  विद्यार्थी: ["student", "students"], विद्यार्थीको: ["student"], bidyarthi: ["student"], vidyarthi: ["student"], pupil: ["student"],
  शिक्षक: ["teacher"], shikshak: ["teacher"], sikshak: ["teacher"],
  अभिभावक: ["parent", "guardian"], abhibhawak: ["parent"], guardian: ["parent"],
  बच्चा: ["child", "children"], छोरा: ["child"], छोरी: ["child"],
  सूचना: ["notice"], suchana: ["notice"], announcement: ["notice"], circular: ["notice"],
  बिदा: ["holiday"], छुट्टी: ["holiday"], bida: ["holiday"], vacation: ["holiday"],
  पात्रो: ["calendar"], क्यालेन्डर: ["calendar"], patro: ["calendar"],
  कक्षा: ["class"], kaksha: ["class"], grade: ["class", "grade"], सेक्सन: ["section"], शाखा: ["section"],
  विषय: ["subject"], bisaya: ["subject"], bishaya: ["subject"],
  गृहकार्य: ["assignment", "homework"], homework: ["assignment"], असाइनमेन्ट: ["assignment"],
  पासवर्ड: ["password"], लगइन: ["sign", "login"], login: ["sign"], signin: ["sign"],
  भर्ना: ["admission", "student"], bharna: ["admission"], admit: ["admission"], enroll: ["enrol"], enrollment: ["enrol"],
  मिति: ["date"], miti: ["date"], वि: ["bs"], "वि.सं": ["bs"],
  शैक्षिक: ["academic"], सत्र: ["year", "academic"], session: ["academic", "year"],
  बढुवा: ["promotion"], चढाउने: ["promote"],
  लेखापाल: ["accountant"], प्रशासक: ["admin", "administrator"],
  timetable: ["timetable"], routine: ["timetable"], तालिका: ["timetable", "schedule"], रुटिन: ["timetable"],
  सेटिङ: ["settings"], setting: ["settings"],
};

/** Letters, digits and combining marks (Devanagari vowel signs are marks). */
const WORD = /[\p{L}\p{N}\p{M}.]+/gu;

/** Light English stemming: "students" → "student", "marking" → "mark". */
function stem(word) {
  if (!/^[a-z]+$/.test(word) || word.length <= 4) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokenize(text, { expand = false } = {}) {
  const out = [];
  for (let raw of String(text || "").toLowerCase().match(WORD) || []) {
    raw = raw.replace(/^\.+|\.+$/g, "");
    if (!raw || STOP.has(raw)) continue;
    const words = expand && SYNONYMS[raw] ? [raw, ...SYNONYMS[raw]] : [raw];
    for (const w of words) out.push(stem(w));
  }
  return out;
}

/* ------------------------------------------------------------------- index */

const K1 = 1.2;
const B = 0.75;

function buildIndex(docs) {
  const units = []; // one per document section
  for (const doc of docs) {
    const header = tokenize(`${doc.title} ${doc.aliases.join(" ")} ${doc.modules.join(" ")}`);
    for (const section of doc.sections) {
      const tokens = tokenize(`${section.heading} ${section.text}`);
      units.push({ doc, section, tokens, tf: counts(tokens), header: counts(header), headerLen: header.length });
    }
  }
  const df = new Map();
  for (const u of units) for (const t of new Set([...u.tf.keys(), ...u.header.keys()])) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = units.reduce((s, u) => s + u.tokens.length, 0) / Math.max(1, units.length);
  const avgHeader = units.reduce((s, u) => s + u.headerLen, 0) / Math.max(1, units.length);
  return { units, df, N: units.length, avgLen, avgHeader };
}

function counts(tokens) {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

const idf = (index, term) => {
  const n = index.df.get(term) || 0;
  return Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
};

const bm25 = (index, tf, len, avg, terms) => {
  let score = 0;
  for (const t of terms) {
    const f = tf.get(t);
    if (!f) continue;
    score += idf(index, t) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * len) / avg)));
  }
  return score;
};

/* ------------------------------------------------------------------ public */

let state = null;
function knowledge() {
  if (!state) {
    const docs = loadDocuments();
    state = { docs, index: buildIndex(docs.filter((d) => d.status === "published")) };
  }
  return state;
}
/** Tests: rebuild from another folder, or reset to the real one with no argument. */
function reloadKnowledge(dir) {
  const docs = loadDocuments(dir);
  state = { docs, index: buildIndex(docs.filter((d) => d.status === "published")) };
  return state;
}

/** SUPER_ADMIN reads everything ADMIN reads. */
const expandRoles = (roles) => {
  const set = new Set(roles || []);
  if (set.has("SUPER_ADMIN")) set.add("ADMIN");
  return set;
};

/** Published documents one of these roles may read. */
function documentsFor(roles) {
  const allowed = expandRoles(roles);
  return knowledge().docs.filter((d) => d.status === "published" && d.roles.some((r) => allowed.has(r)));
}

/**
 * The best documents for a question.
 * @param {string} query
 * @param {object} opts
 * @param {string[]} opts.roles   the user's roles (from req.user, never from the client)
 * @param {object|null} [opts.context]  resolved page context ({ pattern, module })
 * @param {number} [opts.limit]   documents to return
 * @returns {Array<{ doc: object, score: number }>}
 */
function search(query, { roles, context = null, limit = 3 } = {}) {
  const { index } = knowledge();
  const allowed = expandRoles(roles);
  const terms = [...new Set(tokenize(query, { expand: true }))];
  if (!terms.length || !allowed.size) return [];

  const best = new Map(); // doc id -> score
  for (const unit of index.units) {
    const doc = unit.doc;
    if (!doc.roles.some((r) => allowed.has(r))) continue;
    let score = bm25(index, unit.tf, unit.tokens.length, index.avgLen, terms) + 1.5 * bm25(index, unit.header, unit.headerLen, index.avgHeader, terms);
    if (score <= 0) continue;
    if (context?.pattern && doc.routes.includes(context.pattern)) score *= 1.35;
    else if (context?.module && doc.modules.includes(context.module)) score *= 1.15;
    if (!best.has(doc.id) || best.get(doc.id).score < score) best.set(doc.id, { doc, score });
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  if (!ranked.length) return [];
  // Keep documents reasonably close to the best one.
  const top = ranked[0].score;
  return ranked.filter((r, i) => i === 0 || r.score >= top * 0.35).slice(0, limit);
}

/** Documents for the page the user is on (used when the question itself matches nothing). */
function documentsForPage(context, roles) {
  if (!context?.pattern) return [];
  return documentsFor(roles).filter((d) => d.routes.includes(context.pattern));
}

const getDocument = (id) => knowledge().docs.find((d) => d.id === id) || null;

module.exports = {
  KNOWLEDGE_DIR,
  parseFrontMatter,
  loadDocuments,
  tokenize,
  search,
  documentsFor,
  documentsForPage,
  getDocument,
  reloadKnowledge,
  allDocuments: () => knowledge().docs,
};
