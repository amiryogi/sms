import { isAxiosError, isCancel, type AxiosError } from "axios";
import type { ApiErrorBody } from "./types";

/**
 * Every failed API call becomes one ApiFailure, so screens deal with a single
 * shape: a message safe to show, the HTTP status (0 when there was no answer),
 * the backend's error code and any field errors from express-validator.
 */
export class ApiFailure extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly fieldErrors: Record<string, string>;
  readonly isNetwork: boolean;
  readonly isTimeout: boolean;
  readonly isCancelled: boolean;
  /** Set when the session is over (refresh refused): the app returns to sign-in. */
  readonly isSessionExpired: boolean;

  constructor(init: {
    message: string;
    status?: number;
    code?: string | null;
    fieldErrors?: Record<string, string>;
    isNetwork?: boolean;
    isTimeout?: boolean;
    isCancelled?: boolean;
    isSessionExpired?: boolean;
  }) {
    super(init.message);
    this.name = "ApiFailure";
    this.status = init.status ?? 0;
    this.code = init.code ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.isNetwork = init.isNetwork ?? false;
    this.isTimeout = init.isTimeout ?? false;
    this.isCancelled = init.isCancelled ?? false;
    this.isSessionExpired = init.isSessionExpired ?? false;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isPasswordChangeRequired() {
    return this.status === 403 && this.code === "PASSWORD_CHANGE_REQUIRED";
  }
}

export const NETWORK_MESSAGE = "Can't reach the school server. Check your internet connection and try again.";
export const TIMEOUT_MESSAGE = "The server took too long to answer. Try again.";
const SERVER_MESSAGE = "Something went wrong on the server. Try again in a moment.";

const fieldErrorsOf = (body: ApiErrorBody | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const e of body?.errors ?? []) {
    if (typeof e === "object" && e) {
      const key = e.field;
      const msg = e.message;
      if (key && msg && !out[key]) out[key] = msg;
    }
  }
  return out;
};

/** Normalise anything thrown by axios (or our own code) into an ApiFailure. */
export const toApiFailure = (error: unknown): ApiFailure => {
  if (error instanceof ApiFailure) return error;

  if (isCancel(error)) {
    return new ApiFailure({ message: "Request cancelled", isCancelled: true });
  }

  if (isAxiosError(error)) {
    const err = error as AxiosError<ApiErrorBody>;
    if (!err.response) {
      const timeout = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
      return new ApiFailure({
        message: timeout ? TIMEOUT_MESSAGE : NETWORK_MESSAGE,
        isNetwork: !timeout,
        isTimeout: timeout,
      });
    }
    const { status, data } = err.response;
    const body = data && typeof data === "object" ? data : undefined;
    const fieldErrors = fieldErrorsOf(body);
    const first = Object.values(fieldErrors)[0];
    // "Validation failed" alone helps nobody: show the first field message.
    const message =
      status >= 500
        ? SERVER_MESSAGE
        : body?.message === "Validation failed" && first
          ? first
          : body?.message || `Request failed (${status})`;
    return new ApiFailure({ message, status, code: body?.code ?? null, fieldErrors });
  }

  return new ApiFailure({ message: error instanceof Error ? error.message : "Unexpected error" });
};
