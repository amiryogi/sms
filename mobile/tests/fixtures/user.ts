import type { AuthUser } from "@/api/schemas/auth";

/** A signed-in user as /auth/me returns it, with the given roles. */
export const makeUser = (roles: string[], overrides: Partial<AuthUser> = {}): AuthUser =>
  ({
    id: 42,
    username: "test.user",
    email: null,
    mustChangePassword: false,
    firstName: "Asha",
    middleName: null,
    lastName: "Gurung",
    phone: null,
    avatarUrl: null,
    roles,
    permissions: [],
    school: {
      id: 1,
      name: "Demo School",
      code: "DEMO001",
      logoUrl: null,
      bannerUrl: null,
      tagline: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      brandColor: "#0f766e",
    },
    student: null,
    parent: null,
    ...overrides,
  }) as AuthUser;
