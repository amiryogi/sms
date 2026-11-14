/**
 * Every translation key the code uses exists in English, so a screen never
 * shows a raw key like "auth.signIn". When Nepali (ne.json) is added, add it to
 * LOCALES below and this also checks it has every English key.
 */
import fs from "fs";
import path from "path";
import en from "@/i18n/locales/en.json";

const LOCALES: Record<string, unknown> = { en };

const flatten = (obj: unknown, prefix = ""): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(d.name) ? [p] : [];
  });

it("defines every key the code uses", () => {
  const keys = new Set(flatten(en));
  const used = new Set<string>();
  for (const file of sourceFiles(path.resolve(__dirname, "../src"))) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) used.add(m[1]!);
  }
  expect(used.size).toBeGreaterThan(20);
  const missing = [...used].filter((k) => !keys.has(k));
  expect(missing).toEqual([]);
});

it("gives every locale every English key", () => {
  const english = flatten(en);
  for (const [code, strings] of Object.entries(LOCALES)) {
    const have = new Set(flatten(strings));
    expect({ code, missing: english.filter((k) => !have.has(k)) }).toEqual({ code, missing: [] });
  }
});
