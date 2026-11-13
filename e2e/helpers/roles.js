const path = require("node:path");

/** Seeded demo accounts (backend/prisma/seed.js), one per role. */
const ROLES = {
  superadmin: "superadmin@demo.edu.np",
  admin: "admin@demo.edu.np",
  teacher: "teacher1@demo.edu.np",
  examofficer: "examofficer@demo.edu.np",
  accountant: "accountant@demo.edu.np",
  student: "student1@demo.edu.np",
  parent: "parent.stu20240001@demo.edu.np",
};

const AUTH_DIR = path.join(__dirname, "..", ".auth");
/** Saved signed-in browser state for a role: `test.use({ storageState: stateFor("admin") })`. */
const stateFor = (role) => path.join(AUTH_DIR, `${role}.json`);
const DATA_FILE = path.join(AUTH_DIR, "data.json");

module.exports = { ROLES, AUTH_DIR, stateFor, DATA_FILE };
