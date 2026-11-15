/**
 * Importing a published holiday list (admin only).
 *
 *   sources  -> which lists the server holds
 *   preview  -> the rows of a list with their AD dates, marking the ones the
 *               school already has; changes nothing
 *   import   -> creates only the rows the admin ticked, skipping any that
 *               already exist, and records the import
 *
 * Nothing is ever overwritten: an existing holiday (same list row, or the same
 * day and name) is left exactly as it is, including one the admin has edited
 * or switched off.
 */
const fs = require("fs");
const path = require("path");
const prisma = require("../../config/database");
const { dialect } = require("../../database");
const { ApiError } = require("../../utils");
const { parseDateOnly, toIsoDate } = require("../../utils/calendar/dateValidation");
const { MIN_BS_YEAR, MAX_BS_YEAR } = require("../../utils/calendar/bsDateAdapter");
const { HOLIDAY_CATEGORIES } = require("../../utils/calendar/calendarRules");
const { datasetRows, customRows } = require("../../utils/calendar/holidayRows");
const { academicYearFor } = require("./events");

const DATA_DIR = path.join(__dirname, "..", "..", "data", "holidays");

const loadDataset = (bsYear) => {
  const file = path.join(DATA_DIR, `${bsYear}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

/** The built-in lists: [{ bsYear, source, sourceDocument, sourceUrl, count, undated, notes }]. */
const listSources = () =>
  fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}\.json$/.test(f))
    .sort()
    .map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
      return {
        bsYear: d.bsYear,
        source: d.source,
        sourceDocument: d.sourceDocument,
        sourceUrl: d.sourceUrl ?? null,
        count: (d.holidays || []).length,
        undated: d.undated || [],
        notes: d.notes || [],
      };
    });

const readYear = (value) => {
  const year = Number.parseInt(value, 10);
  if (!Number.isInteger(year) || year < MIN_BS_YEAR || year > MAX_BS_YEAR) {
    throw ApiError.badRequest(`Choose a BS year from ${MIN_BS_YEAR} to ${MAX_BS_YEAR}`);
  }
  return year;
};

/** The rows the request is about, with where they come from. */
const resolveRows = (body) => {
  const bsYear = readYear(body?.bsYear);
  if (Array.isArray(body?.rows)) {
    const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 255) : null;
    if (!source) throw ApiError.badRequest("Say where the list comes from (the source)");
    if (!body.rows.length) throw ApiError.badRequest("The list is empty");
    return {
      bsYear,
      source,
      sourceDocument: typeof body.sourceDocument === "string" && body.sourceDocument.trim() ? body.sourceDocument.trim().slice(0, 500) : null,
      rows: customRows(body.rows, bsYear),
      undated: [],
    };
  }
  const dataset = loadDataset(bsYear);
  if (!dataset) throw ApiError.notFound(`There is no built-in holiday list for ${bsYear}. Paste the list instead.`);
  return { bsYear, source: dataset.source, sourceDocument: dataset.sourceDocument, rows: datasetRows(dataset), undated: dataset.undated || [] };
};

/** Marks each usable row with the school's existing holiday it would repeat, if any. */
const markDuplicates = async (schoolId, rows) => {
  const usable = rows.filter((r) => !r.error);
  if (!usable.length) return rows.map((r) => ({ ...r, duplicate: null }));

  const keys = usable.map((r) => r.key);
  const days = [...new Set(usable.map((r) => r.startDate))].map(parseDateOnly);
  const existing = await prisma.calendarEvent.findMany({
    where: {
      schoolId,
      OR: [{ sourceKey: { in: keys } }, { category: { in: HOLIDAY_CATEGORIES }, startDate: { in: days } }],
    },
    select: { id: true, title: true, startDate: true, sourceKey: true, isActive: true },
    orderBy: { id: "asc" },
  });

  const norm = (s) => String(s).trim().toLowerCase();
  const seen = new Set();
  return rows.map((row) => {
    if (row.error) return { ...row, duplicate: null };
    const sameRow = existing.find((e) => e.sourceKey === row.key);
    const sameDay = existing.find((e) => toIsoDate(e.startDate) === row.startDate && norm(e.title) === norm(row.title));
    const hit = sameRow || sameDay;
    let duplicate = hit
      ? { eventId: hit.id, title: hit.title, reason: sameRow ? "Already imported from this list" : "A holiday with this name is already on this day" }
      : null;
    // The same holiday twice within one pasted list.
    const within = `${row.startDate}|${norm(row.title)}`;
    if (!duplicate && seen.has(within)) duplicate = { eventId: null, title: row.title, reason: "Repeated in this list" };
    seen.add(within);
    return { ...row, duplicate };
  });
};

const preview = async (user, body) => {
  const list = resolveRows(body);
  const rows = await markDuplicates(user.schoolId, list.rows);
  return {
    bsYear: list.bsYear,
    source: list.source,
    sourceDocument: list.sourceDocument,
    undated: list.undated,
    rows,
    summary: {
      total: rows.length,
      new: rows.filter((r) => !r.error && !r.duplicate).length,
      duplicates: rows.filter((r) => r.duplicate).length,
      invalid: rows.filter((r) => r.error).length,
    },
  };
};

/**
 * Creates the ticked rows. `body.keys` lists the rows the admin confirmed;
 * `body.confirm` must be true. Duplicates and invalid rows are skipped and
 * reported, never written.
 */
const runImport = async (user, body) => {
  if (body?.confirm !== true) throw ApiError.badRequest("Confirm the import after checking the preview");
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k) => typeof k === "string") : [];
  if (!keys.length) throw ApiError.badRequest("Choose at least one holiday to import");

  const list = resolveRows(body);
  const rows = await markDuplicates(user.schoolId, list.rows);
  const chosen = rows.filter((r) => keys.includes(r.key));
  if (!chosen.length) throw ApiError.badRequest("None of the chosen holidays are in this list");

  const toCreate = chosen.filter((r) => !r.error && !r.duplicate);
  const skipped = chosen
    .filter((r) => r.error || r.duplicate)
    .map((r) => ({ key: r.key, title: r.title, reason: r.error || r.duplicate.reason }));

  const yearIds = new Map();
  for (const row of toCreate) {
    if (!yearIds.has(row.startDate)) yearIds.set(row.startDate, await academicYearFor(user.schoolId, row.startDate));
  }

  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.calendarImport.create({
      data: {
        schoolId: user.schoolId,
        calendarYear: list.bsYear,
        source: list.source,
        sourceDocument: list.sourceDocument,
        status: "COMPLETED",
        createdCount: toCreate.length,
        skippedCount: skipped.length,
        importedById: user.id,
      },
    });
    for (const row of toCreate) {
      // Checked again inside the transaction: two admins importing at once must not both create it.
      const clash = await tx.calendarEvent.findFirst({
        where: {
          schoolId: user.schoolId,
          OR: [{ sourceKey: row.key }, { category: { in: HOLIDAY_CATEGORIES }, startDate: parseDateOnly(row.startDate), title: dialect.text.equals(row.title) }],
        },
        select: { id: true },
      });
      if (clash) {
        skipped.push({ key: row.key, title: row.title, reason: "Already exists" });
        continue;
      }
      await tx.calendarEvent.create({
        data: {
          schoolId: user.schoolId,
          academicYearId: yearIds.get(row.startDate),
          title: row.title,
          description: row.titleNe,
          category: row.category,
          startDate: parseDateOnly(row.startDate),
          endDate: parseDateOnly(row.endDate),
          isAllDay: true,
          recurrence: "NONE",
          audienceType: "ALL",
          status: "PUBLISHED",
          isActive: true,
          source: list.source,
          sourceDocument: list.sourceDocument,
          sourcePublishedDate: row.bsStart,
          applicability: row.applicability,
          sourceKey: row.key,
          importId: record.id,
          createdById: user.id,
        },
      });
    }
    const created = toCreate.length - skipped.filter((s) => s.reason === "Already exists").length;
    return tx.calendarImport.update({
      where: { id: record.id },
      data: { createdCount: created, skippedCount: skipped.length },
    });
  });

  return {
    importId: result.id,
    bsYear: list.bsYear,
    source: list.source,
    created: result.createdCount,
    skipped,
  };
};

/** Past imports of the school, newest first. */
const listImports = async (schoolId) => {
  const rows = await prisma.calendarImport.findMany({
    where: { schoolId },
    select: {
      id: true,
      calendarYear: true,
      source: true,
      sourceDocument: true,
      status: true,
      createdCount: true,
      skippedCount: true,
      importedAt: true,
      importedBy: { select: { firstName: true, middleName: true, lastName: true } },
    },
    orderBy: [{ importedAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return rows;
};

module.exports = { loadDataset, listSources, preview, runImport, listImports };
