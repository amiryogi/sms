import axios from "axios";
import { API_URL } from "@/config/env";
import { toApiFailure } from "../errors";
import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import { publicSchoolSchema, schoolSchema, type PublicSchool, type School } from "../schemas/auth";

export const schoolService = {
  /** Public branding for the sign-in screen (no token). 404 when the code is unknown or inactive. */
  async publicByCode(code: string, signal?: AbortSignal): Promise<PublicSchool> {
    try {
      const res = await axios.get<ApiEnvelope<unknown>>(`${API_URL}/public/school/${encodeURIComponent(code.trim())}`, {
        signal,
        timeout: 15_000,
      });
      return publicSchoolSchema.parse(res.data.data);
    } catch (error) {
      throw toApiFailure(error);
    }
  },

  /** The signed-in user's school. */
  async mine(signal?: AbortSignal): Promise<School> {
    const data = await unwrap(http.get<ApiEnvelope<unknown>>("/school", { signal }));
    return schoolSchema.parse(data);
  },
};
