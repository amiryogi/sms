/**
 * Role helpers. Navigation only: the backend decides access on every request.
 *
 * A SUPER_ADMIN is an ADMIN everywhere (the backend's `authenticate` adds ADMIN
 * to their roles, and the web's hasRole("ADMIN") is true for them).
 */
export type Role = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "EXAM_OFFICER" | "ACCOUNTANT" | "STUDENT" | "PARENT";

/** The app's role areas, one route group each (src/app/(<area>)). */
export type RoleArea = "admin" | "exam" | "finance" | "teacher" | "parent" | "student";

export const hasRole = (roles: readonly string[] | null | undefined, role: Role): boolean => {
  const list = roles ?? [];
  if (list.includes(role)) return true;
  return role === "ADMIN" && list.includes("SUPER_ADMIN");
};

export const hasAnyRole = (roles: readonly string[] | null | undefined, wanted: readonly Role[]) => wanted.some((r) => hasRole(roles, r));

const AREA_ROLES: Record<RoleArea, Role[]> = {
  admin: ["ADMIN"],
  exam: ["EXAM_OFFICER"],
  finance: ["ACCOUNTANT"],
  teacher: ["TEACHER"],
  parent: ["PARENT"],
  student: ["STUDENT"],
};

/** Order decides the home area of a user with several roles. */
const AREA_ORDER: RoleArea[] = ["admin", "exam", "finance", "teacher", "parent", "student"];

/** Every area the user may open, home first. */
export const areasFor = (roles: readonly string[] | null | undefined): RoleArea[] =>
  AREA_ORDER.filter((area) => hasAnyRole(roles, AREA_ROLES[area]));

/** The area the app opens on after sign-in, or null for a user with no known role. */
export const homeAreaFor = (roles: readonly string[] | null | undefined): RoleArea | null => areasFor(roles)[0] ?? null;

export const canOpenArea = (roles: readonly string[] | null | undefined, area: RoleArea) => hasAnyRole(roles, AREA_ROLES[area]);

export const AREA_LABELS: Record<RoleArea, string> = {
  admin: "Administration",
  exam: "Examinations",
  finance: "Finance",
  teacher: "Teaching",
  parent: "Parent",
  student: "Student",
};

/** Human label for a backend role name. */
export const roleLabel = (role: string): string =>
  ({
    SUPER_ADMIN: "Super admin",
    ADMIN: "Admin",
    TEACHER: "Teacher",
    EXAM_OFFICER: "Exam officer",
    ACCOUNTANT: "Accountant",
    STUDENT: "Student",
    PARENT: "Parent",
  })[role] ?? role;
