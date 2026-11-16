import { TARGET_PATTERN } from "./registry";

/**
 * The first visible element with this data-guide id, or null. Only ids from the walkthrough
 * registry's format are looked up, and always through CSS.escape: nothing else can become a
 * selector.
 */
export function findTarget(id) {
  if (!id || !TARGET_PATTERN.test(id)) return null;
  for (const el of document.querySelectorAll(`[data-guide="${CSS.escape(id)}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}
