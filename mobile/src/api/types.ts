/** The backend's response envelope (backend/src/utils/ApiResponse.js). */
export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedEnvelope<T> = ApiEnvelope<T[]> & { pagination: Pagination };

/** A page of rows plus its pagination, as services return it. */
export type Page<T> = { rows: T[]; pagination: Pagination };

/** Error body (backend/src/middleware/error.middleware.js). */
export type ApiErrorBody = {
  success: false;
  message?: string;
  code?: string;
  /** express-validator failures: [{ field, message }] (middleware/validate.middleware.js). */
  errors?: (string | { field?: string; message?: string })[];
};

export type Id = number;
