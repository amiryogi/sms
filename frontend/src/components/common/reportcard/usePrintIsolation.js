import { useEffect } from "react";

/**
 * While a report-card overlay is open, print only the overlay.
 *
 * The overlays are portalled to <body>, outside #root. This hook marks <body>
 * so the print rule in styles/app.css can hide #root. Without it the page behind the
 * overlay (e.g. the whole Report Cards admin screen) printed as an extra first
 * page before the report cards.
 *
 * @param {boolean} active - false for a card shown inline in a page
 */
export default function usePrintIsolation(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    document.body.classList.add("report-print-isolate");
    return () => document.body.classList.remove("report-print-isolate");
  }, [active]);
}
