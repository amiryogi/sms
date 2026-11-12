const path = require("node:path");

/** Seeded demo accounts (backend/prisma/seed.js), one per role. */
const ROLES = {
  superadmin: "superadmin@svi.edu.np",
  admin: "admin@svi.edu.np",
  teacher: "teacher1@svi.edu.np",
  examofficer: "examofficer@svi.edu.np",
  accountant: "accountant@svi.edu.np",
  student: "student1@svi.edu.np",
  parent: "parent.stu20240001@svi.edu.np",
};

const AUTH_DIR = path.join(__dirname, "..", ".auth");
/** Saved signed-in browser state for a role: `test.use({ storageState: stateFor("admin") })`. */
const stateFor = (role) => path.join(AUTH_DIR, `${role}.json`);
const DATA_FILE = path.join(AUTH_DIR, "data.json");

module.exports = { ROLES, AUTH_DIR, stateFor, DATA_FILE };
