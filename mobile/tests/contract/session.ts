import { tokenStore } from "@/api/http";
import { authService } from "@/api/services/auth";

/** Seeded demo accounts (backend/prisma/seed.js). Test-only: never in the app. */
export const DEMO_PASSWORD = "password123";
export const ACCOUNTS = {
  admin: "admin",
  superadmin: "superadmin",
  teacher: "teacher1",
  examOfficer: "examofficer",
  accountant: "accountant",
  student: "stu20240001",
  parent: "p.stu20240001",
} as const;

/** Sign in through the app's service and keep the tokens where the app keeps them. */
export const signInAs = async (identifier: string, password = DEMO_PASSWORD) => {
  const res = await authService.login({ identifier, password, schoolCode: "DEMO001" });
  await tokenStore.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  return res.user;
};
