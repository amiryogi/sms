import { z } from "zod";

/**
 * The signed-in user as POST /auth/login and GET /auth/me return it
 * (backend/src/controllers/auth.controller.js). Validated at the boundary:
 * everything the app derives roles and navigation from is checked here.
 * Unknown extra fields are kept (looseObject) so a backend addition never breaks sign-in.
 */
const nullableString = z
  .string()
  .nullish()
  .transform((v) => v ?? null);

export const ROLE_NAMES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

const namedRef = z.looseObject({ id: z.number(), name: z.string() });

export const schoolSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  logoUrl: nullableString,
  bannerUrl: nullableString,
  tagline: nullableString,
  address: nullableString,
  phone: nullableString,
  email: nullableString,
  website: nullableString,
  brandColor: nullableString,
});

const enrollmentSchema = z.looseObject({
  id: z.number(),
  rollNumber: z.number().nullish(),
  class: namedRef.nullish(),
  section: namedRef.nullish(),
  academicYear: z.looseObject({ id: z.number(), name: z.string(), isCurrent: z.boolean().optional() }).nullish(),
});

export const authUserSchema = z.looseObject({
  id: z.number(),
  username: nullableString,
  email: nullableString,
  mustChangePassword: z.boolean().default(false),
  firstName: z.string(),
  middleName: nullableString,
  lastName: z.string(),
  phone: nullableString,
  avatarUrl: nullableString,
  roles: z.array(z.string()).min(1),
  permissions: z.array(z.string()).default([]),
  school: schoolSchema,
  student: z
    .looseObject({
      id: z.number(),
      admissionNumber: z.string().nullish(),
      rollNumber: z.number().nullish(),
      enrollments: z.array(enrollmentSchema).default([]),
    })
    .nullish(),
  parent: z
    .looseObject({
      id: z.number(),
      children: z
        .array(
          z.looseObject({
            studentId: z.number(),
            studentName: z.string(),
            class: nullableString,
            section: nullableString,
            rollNumber: z.number().nullish(),
            relationship: nullableString,
            isPrimary: z.boolean().nullish(),
          }),
        )
        .default([]),
    })
    .nullish(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type School = z.infer<typeof schoolSchema>;

export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const loginResponseSchema = sessionSchema.extend({ user: authUserSchema });

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const publicSchoolSchema = z.looseObject({
  name: z.string(),
  code: z.string(),
  logoUrl: nullableString,
  tagline: nullableString,
  address: nullableString,
  phone: nullableString,
  email: nullableString,
  website: nullableString,
  brandColor: nullableString,
});

export type PublicSchool = z.infer<typeof publicSchoolSchema>;
