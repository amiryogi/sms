import { useLayoutEffect } from "react";

// Height available for content on one A4 sheet, in mm. The sheet is 297mm with
// 15mm padding on screen (267mm) and prints inside 8mm page margins with 6mm
// padding (269mm, at a slightly narrower width). 266mm fits both.
const FIT_HEIGHT_MM = 266;
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
      const limit = FIT_HEIGHT_MM * (page.offsetWidth / 210);
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
