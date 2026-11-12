import apiClient from "../api/apiClient";
import { fullName } from "../utils/format";

/**
 * React-admin Data Provider for the examination pilot.
 *
 * It only talks to the existing Express API through `apiClient`, so the JWT
 * header and the refresh-and-retry on 401 are the app's own. It holds no
 * business rules: the backend decides who sees what (DRAFT exams, school and
 * year scoping, publication).
 *
 * The examination endpoints return whole lists with no paging, sorting or
 * search parameters, so those three happen here, in the browser. That is fine
 * for a school's handful of exams and one class section of results at a time.
 */

/** `{ success, message, data }` -> data; API errors -> an Error react-admin can show. */
const call = async (request) => {
  try {
    const response = await request;
    return response.data?.data;
  } catch (error) {
    const status = error.response?.status ?? 0;
    const e = new Error(error.response?.data?.message || error.message || "Request failed");
    e.status = status;
    e.body = error.response?.data;
    throw e;
  }
};

const asArray = (data, key) => (Array.isArray(data) ? data : data?.[key] || []);
const text = (v) => String(v ?? "").toLowerCase();
const get = (record, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), record);

const sortRows = (rows, { field, order } = {}) => {
  if (!field) return rows;
  const dir = order === "DESC" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = get(a, field);
    const y = get(b, field);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
  });
};

const page = (rows, { page: p = 1, perPage = 25 } = {}) => ({
  data: rows.slice((p - 1) * perPage, p * perPage),
  total: rows.length,
});

// ---- resources -------------------------------------------------------------

const exams = {
  list: async (filter = {}) => {
    const params = filter.academicYearId ? { academicYearId: filter.academicYearId } : {};
    let rows = asArray(await call(apiClient.get("/exams", { params })), "exams").map((e) => ({
      ...e,
      subjectCount: e._count?.examSubjects ?? 0,
    }));
    if (filter.q) rows = rows.filter((e) => text(e.name).includes(text(filter.q)));
    if (filter.status) rows = rows.filter((e) => e.status === filter.status);
    if (filter.examType) rows = rows.filter((e) => e.examType === filter.examType);
    return rows;
  },
  one: (id) => call(apiClient.get(`/exams/${id}`)),
};

const results = {
  // One exam + class + section at a time: that is what the API offers.
  list: async (filter = {}) => {
    const { examId, classId, sectionId } = filter;
    if (!examId || !classId || !sectionId) return [];
    const data = await call(apiClient.get("/report-cards", { params: { examId, classId, sectionId } }));
    let rows = (data?.students || []).map((s) => ({
      ...s,
      id: s.studentId,
      name: fullName(s),
      subjectsWithMarks: s.results?.length ?? 0,
      classRank: s.reportCard?.classRank ?? null,
      cardStatus: !s.reportCard ? "none" : s.reportCard.isPublished ? "published" : "generated",
    }));
    if (filter.q) rows = rows.filter((s) => text(s.name).includes(text(filter.q)) || text(s.rollNumber) === text(filter.q));
    if (filter.outcome === "passed") rows = rows.filter((s) => s.isPassed);
    if (filter.outcome === "failed") rows = rows.filter((s) => !s.isPassed);
    if (filter.cardStatus) rows = rows.filter((s) => s.cardStatus === filter.cardStatus);
    return rows;
  },
};

// Reference lists for filters.
const simple = (url, key) => ({ list: async () => asArray(await call(apiClient.get(url)), key) });

const RESOURCES = {
  exams,
  results,
  "academic-years": simple("/academic-years", "academicYears"),
  classes: simple("/classes", "classes"),
  sections: simple("/sections", "sections"),
};

const resourceOf = (name) => {
  const r = RESOURCES[name];
  if (!r) throw new Error(`Unknown resource "${name}"`);
  return r;
};
const readOnly = (action) => () => Promise.reject(new Error(`${action} is not available here. Use the Exams or Report Cards page.`));

const dataProvider = {
  getList: async (resource, params) => page(sortRows(await resourceOf(resource).list(params.filter), params.sort), params.pagination),
  getOne: async (resource, { id }) => {
    const r = resourceOf(resource);
    if (r.one) return { data: await r.one(id) };
    const row = (await r.list({})).find((x) => String(x.id) === String(id));
    if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
    return { data: row };
  },
  getMany: async (resource, { ids }) => {
    const wanted = new Set(ids.map(String));
    return { data: (await resourceOf(resource).list({})).filter((x) => wanted.has(String(x.id))) };
  },
  getManyReference: async (resource, params) =>
    page(sortRows((await resourceOf(resource).list(params.filter)).filter((x) => String(x[params.target]) === String(params.id)), params.sort), params.pagination),
  // Writes stay on the existing screens and endpoints (lifecycle buttons call
  // the exam service directly; see ExamList).
  create: readOnly("Creating"),
  update: readOnly("Editing"),
  updateMany: readOnly("Editing"),
  delete: readOnly("Deleting"),
  deleteMany: readOnly("Deleting"),
};

export default dataProvider;
