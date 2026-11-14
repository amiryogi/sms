/**
 * Fresh modules for every test: jest.resetModules() then require. Typing into
 * forms and re-rendering screens left React state behind that blanked the
 * next test's render (see docs/TESTING.md). Use in beforeEach:
 *
 *   let m: Fresh;
 *   beforeEach(async () => { m = await fresh(); });
 *   ... await m.render(<Screen />, { signedIn: true }); m.screen().getByText(...)
 *
 * Mocks declared with jest.mock() at the top of the test file still apply.
 */
import type { ReactNode } from "react";
import type * as RTL from "@testing-library/react-native";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export type Fresh = {
  rtl: typeof RTL;
  /** Testing Library replaces `screen` on every render: always read it through here. */
  screen: () => typeof RTL.screen;
  render: (ui: ReactNode, options?: { withAuth?: boolean; signedIn?: boolean }) => ReturnType<typeof RTL.render>;
  req: <T = Record<string, unknown>>(path: string) => T;
  /** Device seeding from the same fresh registry (its own storage mocks). */
  helpers: typeof import("./helpers");
};

let current: typeof RTL | null = null;

/* eslint-disable @typescript-eslint/no-require-imports -- fresh module registry per test */
export const fresh = async (): Promise<Fresh> => {
  if (current) await current.cleanup();
  jest.resetModules();
  const rtl: typeof RTL = require("@testing-library/react-native/pure");
  current = rtl;
  const helpers = require("./helpers");
  await helpers.resetDevice();
  const { renderWithProviders } = require("./renderWithProviders");
  return {
    rtl,
    screen: () => rtl.screen,
    render: (ui, options) => renderWithProviders(ui, options),
    req: (path) => require(path),
    helpers,
  };
};
/* eslint-enable @typescript-eslint/no-require-imports */

afterEach(async () => {
  if (current) await current.cleanup();
  current = null;
});
