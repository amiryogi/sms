import { useLayoutEffect } from "react";

// Slack, in mm, between the content and the bottom margin. Print lays the
// sheet out with the same margins as the screen (see nebSheetStyles.js).
const SLACK_MM = 1;
const MIN_ZOOM = 0.5;

/**
 * Keeps one report card on one A4 page, for individual and bulk print alike.
 *
 * `ref` points at a wrapper whose first child holds the sheet's content. When
 * the content is taller than a page (many subjects, a long school name, a long
 * footer), the inner element is zoomed down until it fits. CSS `zoom` reflows
 * the content at the smaller scale, so it keeps the full width.
 *
 * Skipped on narrow screens, where the sheet is not laid out at A4 width.
 */
export default function useFitToPage(ref, deps = []) {
  useLayoutEffect(() => {
    const outer = ref.current;
    const inner = outer?.firstElementChild;
    const page = outer?.parentElement;
    if (!outer || !inner || !page) return undefined;

    const fit = () => {
      inner.style.zoom = "";
      if (!page.offsetWidth || window.matchMedia("(max-width: 800px)").matches) return;
      // One A4 page minus the sheet's own top and bottom margins (its padding).
      const pxPerMm = page.offsetWidth / 210;
      const style = window.getComputedStyle(page);
      const limit = (297 - SLACK_MM) * pxPerMm - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      let zoom = 1;
      for (let i = 0; i < 6; i += 1) {
        const height = outer.offsetHeight;
        if (height <= limit) break;
        zoom = Math.max(MIN_ZOOM, zoom * (limit / height) * 0.995);
        inner.style.zoom = String(zoom);
        if (zoom === MIN_ZOOM) break;
      }
    };

    fit();
    // Images (the logo) and web fonts change the height after first layout.
    const images = [...inner.querySelectorAll("img")];
    images.forEach((img) => {
      img.addEventListener("load", fit);
      img.addEventListener("error", fit);
    });
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && fit());
    window.addEventListener("resize", fit);
    return () => {
      cancelled = true;
      images.forEach((img) => {
        img.removeEventListener("load", fit);
        img.removeEventListener("error", fit);
      });
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
