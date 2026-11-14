/**
 * The Vidyalaya SMS brand images, built from assets/brand/source/ by
 * scripts/build-brand-assets.py (run it again after changing a source image).
 *
 * The emblem is split into layers on one shared canvas (arc, cap, body) so
 * they stack exactly; `layout` has every image's size in px, and where the
 * emblem and the words sit inside the full lockup. logo.png (the whole lockup
 * in one image) is not bundled: it is there for store listings and the web.
 */
import layout from "./brandAssets.json";

export const BRAND_IMAGES = {
  arc: require("../../../assets/brand/arc.png"),
  cap: require("../../../assets/brand/cap.png"),
  body: require("../../../assets/brand/body.png"),
  mark: require("../../../assets/brand/mark.png"),
  wordmark: require("../../../assets/brand/wordmark.png"),
  sms: require("../../../assets/brand/sms.png"),
  rules: require("../../../assets/brand/rules.png"),
  waves: require("../../../assets/brand/waves.png"),
} as const;

export const BRAND_LAYOUT = layout;

/** Width of the emblem in the native splash (app.config.ts `imageWidth`); the intro starts from it. */
export const SPLASH_IMAGE_WIDTH = 150;

/** The emblem's height for a given width. */
export const markHeight = (width: number) => (width * layout.mark.height) / layout.mark.width;
