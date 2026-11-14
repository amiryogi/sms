import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { AcademicYear, SchoolClass, SchoolSection } from "@/types/admin";

/** backend/src/routes/{academicYear,class,section}.routes.js: read side. */
export const academicService = {
  currentYear: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<AcademicYear | null>>("/academic-years/current", { signal })),
  classes: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<SchoolClass[]>>("/classes", { signal })),
  sections: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<SchoolSection[]>>("/sections", { signal })),
};
