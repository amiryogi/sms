/**
 * The phone's report-card CSS is a generated copy of the web's. If the web
 * stylesheet changes, this fails until `node scripts/sync-report-card-css.js`
 * is run, so the printed card never silently drifts between web and phone.
 */
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- a plain Node script
const { build, OUT, WEB } = require("../../scripts/sync-report-card-css.js");

const webPresent = fs.existsSync(WEB);

(webPresent ? it : it.skip)("matches the web app's report-card stylesheets", () => {
  expect(fs.readFileSync(OUT, "utf8")).toBe(build());
});
