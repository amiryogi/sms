// Runs once before the tests:
//  1. signs every role in through the API and saves the browser state, so tests
//     start signed in without repeating the login form;
//  2. finds the seeded exam / class / section the report-card tests use, and
//     makes sure its report cards are generated and published.
const fs = require("node:fs");
const { call, login } = require("./helpers/api");
const { ROLES, AUTH_DIR, stateFor, DATA_FILE } = require("./helpers/roles");

module.exports = async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const origin = process.env.E2E_BASE_URL;
  const tokens = {};
  const users = {};
  for (const [role, email] of Object.entries(ROLES)) {
    const session = await login(email);
    tokens[role] = session.accessToken;
    users[role] = session.user;
    fs.writeFileSync(
      stateFor(role),
      JSON.stringify({
        cookies: [],
        origins: [{ origin, localStorage: [{ name: "accessToken", value: session.accessToken }, { name: "refreshToken", value: session.refreshToken }] }],
      }),
    );
  }

  const admin = tokens.admin;
  const list = (res, key) => (Array.isArray(res.body?.data) ? res.body.data : res.body?.data?.[key] || []);
  const exams = list(await call("GET", "/exams", admin), "exams");
  const exam = exams.find((e) => /First Terminal/i.test(e.name)) || exams.find((e) => e._count?.examSubjects > 0);
  const classes = list(await call("GET", "/classes", admin), "classes");
  const cls = classes.find((c) => c.gradeLevel === 9) || classes[0];
  const sections = list(await call("GET", "/sections", admin), "sections");
  const section = sections.find((s) => s.name === "A") || sections[0];
  if (!exam || !cls || !section) throw new Error("Seed data not found: run the seed on the test database first.");

  const scope = { examId: exam.id, classId: cls.id, sectionId: section.id };
  const query = `examId=${scope.examId}&classId=${scope.classId}&sectionId=${scope.sectionId}`;
  let cards = await call("GET", `/report-cards?${query}`, admin);
  if (cards.body.data.students.some((s) => !s.reportCard)) {
    const gen = await call("POST", "/report-cards/generate", admin, scope);
    if (gen.status >= 400) throw new Error(`generate report cards: ${gen.status} ${gen.body?.message}`);
  }
  await call("PUT", "/report-cards/publish", admin, scope);
  cards = await call("GET", `/report-cards?${query}`, admin);

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        scope,
        exam: { id: exam.id, name: exam.name, status: exam.status },
        yearId: exam.academicYearId,
        students: cards.body.data.students.map((s) => ({ id: s.studentId, name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "), rollNumber: s.rollNumber, gpa: s.gpa, grade: s.overallGrade, isPassed: s.isPassed })),
        studentId: users.student.student?.id,
        tokens,
      },
      null,
      1,
    ),
  );
};
