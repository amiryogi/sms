/**
 * Files picked on the phone, checked against the server's rules before upload
 * (backend/src/middleware/upload.middleware.js). The server still checks each
 * file's magic bytes; this only gives the person the error early.
 */
export type PickedFile = { uri: string; name: string; mimeType: string; size: number | null };

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/gif": "GIF image",
  "image/webp": "WebP image",
  "application/pdf": "PDF",
  "application/msword": "Word document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word document",
  "application/vnd.ms-excel": "Excel sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel sheet",
  "text/plain": "Text file",
};

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

/** The MIME type to send: the picker's, or one guessed from the extension when the picker gave none. */
export const mimeTypeOf = (file: { name: string; mimeType?: string | null }): string => {
  const given = file.mimeType?.toLowerCase();
  if (given && given !== "application/octet-stream") return given === "image/jpg" ? "image/jpeg" : given;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? "application/octet-stream";
};

/** Why a file can't be sent, or null when it can. */
export const fileProblem = (file: PickedFile): string | null => {
  if (!ALLOWED_MIME_TYPES[file.mimeType]) return `${file.name}: this type of file can't be uploaded (images, PDF, Word, Excel or text only).`;
  if (file.size !== null && file.size > MAX_UPLOAD_BYTES) return `${file.name} is larger than 5 MB.`;
  return null;
};

/** Checks a set of files against the type, size and count rules. */
export const filesProblem = (files: PickedFile[], maxFiles: number): string | null => {
  if (files.length > maxFiles) return `At most ${maxFiles} files.`;
  for (const f of files) {
    const p = fileProblem(f);
    if (p) return p;
  }
  return null;
};

/** React Native's FormData file part. */
export const appendFile = (form: FormData, field: string, file: PickedFile) => {
  form.append(field, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
};
