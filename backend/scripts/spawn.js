/**
 * Run a command synchronously with inherited stdio. On Windows, npm/npx are
 * .cmd shims that need a shell; Node 24 deprecates passing an argument list
 * together with `shell: true` (DEP0190), so there the command line is quoted
 * and joined into one string instead.
 */
const { spawnSync } = require("node:child_process");

const quote = (arg) => (/^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${String(arg).replace(/"/g, '\\"')}"`);

const run = (cmd, args = [], options = {}) => {
  if (process.platform !== "win32") return spawnSync(cmd, args, { stdio: "inherit", ...options });
  return spawnSync([cmd, ...args].map(quote).join(" "), { stdio: "inherit", shell: true, ...options });
};

module.exports = { run };
