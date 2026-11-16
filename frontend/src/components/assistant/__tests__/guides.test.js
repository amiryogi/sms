/**
 * The walkthrough registry against the real app: ids and roles match the server's catalog,
 * every target is a data-guide attribute on a real control, every page exists in App.jsx and
 * in the role's menu, and the text exists in both languages.
 *   npm test
 */
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES, TARGET_PATTERN, resolvePath } from "../guides/registry";
import { getNavSections } from "../../../layouts/navigation";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "../../..");
const SERVER_GUIDES = JSON.parse(fs.readFileSync(path.join(SRC, "../../backend/src/data/assistant/guides.json"), "utf8"));

const allSource = (() => {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== "__tests__") walk(p);
      else if (/\.jsx?$/.test(e.name)) out.push(fs.readFileSync(p, "utf8"));
    }
  };
  walk(SRC);
  return out.join("\n");
})();
const APP = fs.readFileSync(path.join(SRC, "App.jsx"), "utf8");

/** Menu paths a role sees (hasRole as AuthContext defines it). */
const menuFor = (role) => {
  const roles = role === "SUPER_ADMIN" ? ["SUPER_ADMIN", "ADMIN"] : [role];
  const hasRole = (r) => roles.includes(r);
  return new Set(getNavSections(hasRole).flatMap((s) => s.items.map((i) => i.path)));
};

describe("walkthrough registry", () => {
  test("has the same walkthroughs and roles as the server", () => {
    expect(Object.keys(GUIDES).sort()).toEqual(SERVER_GUIDES.map((g) => g.id).sort());
    for (const g of SERVER_GUIDES) expect([...GUIDES[g.id].roles].sort()).toEqual([...g.roles].sort());
  });

  test("every target is allowed by the pattern and exists on a real control", () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      expect(guide.steps.length).toBeGreaterThan(1);
      for (const step of guide.steps) {
        if (!step.target) continue;
        expect({ id, target: step.target, ok: TARGET_PATTERN.test(step.target) }).toEqual({ id, target: step.target, ok: true });
        if (step.target.startsWith("nav:")) continue;
        expect({ id, target: step.target, tagged: allSource.includes(`"${step.target}"`) }).toEqual({ id, target: step.target, tagged: true });
      }
    }
  });

  test("every page is a route in App.jsx and in each role's menu", () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const role of guide.roles) {
        const menu = menuFor(role);
        for (const step of guide.steps) {
          const route = resolvePath(step.route, [role]);
          if (route) expect({ id, role, route, inApp: APP.includes(`path="${route}"`) }).toEqual({ id, role, route, inApp: true });
          if (step.target?.startsWith("nav:/")) {
            const link = resolvePath(step.target.slice(4), [role]);
            expect({ id, role, link, inMenu: menu.has(link) }).toEqual({ id, role, link, inMenu: true });
          }
        }
      }
    }
  });

  test("text exists in English and Nepali", () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      expect(guide.title.en && guide.title.ne).toBeTruthy();
      for (const step of guide.steps) {
        for (const field of ["title", "body", "missing"]) {
          if (!step[field]) continue;
          expect({ id, field, en: !!step[field].en, ne: /[ऀ-ॿ]/.test(step[field].ne) || step[field].ne === step[field].en }).toEqual({ id, field, en: true, ne: true });
        }
      }
    }
  });

  test("the target pattern rejects anything but registry ids", () => {
    for (const bad of ['a"],[onclick', "body", "*", "nav:javascript:alert(1)", "attendance.save]", "x", ".x", "nav:/a b", "students.add\"><img"]) {
      expect({ bad, ok: TARGET_PATTERN.test(bad) }).toEqual({ bad, ok: false });
    }
    for (const good of ["nav:menu", "nav:/teacher/attendance", "nav:/{portal}/results", "attendance.save", "reportCards.printAll"]) {
      expect(TARGET_PATTERN.test(good)).toBe(true);
    }
  });

  test("{portal} resolves by role", () => {
    expect(resolvePath("/{portal}/results", ["STUDENT"])).toBe("/student/results");
    expect(resolvePath("/{portal}/results", ["PARENT"])).toBe("/parent/results");
    expect(resolvePath(undefined, ["PARENT"])).toBeUndefined();
  });
});
