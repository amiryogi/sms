import { API_ORIGIN } from "@/config/env";

/**
 * A backend asset path (logo, avatar, attachment) as a loadable URL. Disk
 * uploads come back relative ("uploads/logo-1.png"), Cloudinary ones absolute.
 * Port of frontend/src/utils/assets.js.
 */
export const resolveAssetUrl = (url: string | null | undefined, origin: string = API_ORIGIN): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/");
  return origin ? `${origin}/${path}` : null;
};
