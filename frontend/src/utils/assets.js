/**
 * Resolve a backend asset path (school logo, banner, avatar, upload) to a URL the
 * browser can load.
 *
 * The backend stores uploads as a relative string like `uploads/logo-123.png`
 * (see resolveFileUrl in backend/src/controllers/upload.controller.js) but
 * returns Cloudinary URLs absolute. Static files are served from the API origin,
 * which is VITE_API_URL minus its `/api/v1` suffix.
 *
 * This was copy-pasted into four files; import it instead of adding a fifth.
 */
export const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  const path = url
    .replace(/^\\?/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");
  return `${base}/${path}`;
};

export default resolveAssetUrl;
