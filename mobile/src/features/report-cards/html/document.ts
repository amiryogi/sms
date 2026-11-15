import type { ReportCard } from "@/types/api";
import { nebSheetHtml } from "./nebSheet";
import { performanceSheetHtml } from "./performanceSheet";
import { GRADE_LEGEND_CSS, NEB_SHEET_CSS, PERF_SHEET_CSS } from "./sheetCss.generated";

/**
 * Port of the web's useFitToPage: zoom the content down until one card fits
 * one A4 page (many subjects, a long school name). Runs in the WebView /
 * print renderer; where scripts don't run, the card simply keeps its size.
 */
const FIT_SCRIPT = `
(function () {
  function fit() {
    var outer = document.querySelector('.rc-fit');
    var inner = outer && outer.firstElementChild;
    var page = outer && outer.parentElement;
    if (!outer || !inner || !page || !page.offsetWidth) return;
    inner.style.zoom = '';
    var pxPerMm = page.offsetWidth / 210;
    var style = window.getComputedStyle(page);
    var limit = (297 - 1) * pxPerMm - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var zoom = 1;
    for (var i = 0; i < 6; i++) {
      var h = outer.offsetHeight;
      if (h <= limit) break;
      zoom = Math.max(0.5, zoom * (limit / h) * 0.995);
      inner.style.zoom = String(zoom);
      if (zoom === 0.5) break;
    }
  }
  fit();
  Array.prototype.forEach.call(document.images, function (img) { img.addEventListener('load', fit); img.addEventListener('error', fit); });
  window.addEventListener('resize', fit);
})();`;

export type ReportCardHtmlOptions = {
  /** Logo as a URL or data: URI; null prints no logo (as the web does when it fails). */
  logoSrc: string | null;
};

/**
 * A complete HTML document for one report card: the school's template
 * (`layout.template`), the web's own stylesheets, A4 page rules. Used for the
 * on-screen preview (WebView) and for PDF/print (expo-print).
 */
export const reportCardHtml = (card: ReportCard, { logoSrc }: ReportCardHtmlOptions): string => {
  const perf = card.layout?.template === "performanceReport";
  const sheet = perf ? performanceSheetHtml(card, logoSrc) : nebSheetHtml(card, logoSrc);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=840, initial-scale=1" />
<title>Report card</title>
<style>
/* The web app's font stack (frontend/src/styles/app.css), which the sheet falls back to. */
:root { --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
html, body { margin: 0; padding: 0; background: #ffffff; }
@page { size: A4; margin: 8mm; }
@media screen { body { padding: 12px 0; } .report-card-container { padding: 0 12px; } }
${perf ? PERF_SHEET_CSS : NEB_SHEET_CSS}
${GRADE_LEGEND_CSS}
</style>
</head>
<body>
<div class="report-card-container">${sheet}</div>
${perf ? "" : `<script>${FIT_SCRIPT}</script>`}
</body>
</html>`;
};
