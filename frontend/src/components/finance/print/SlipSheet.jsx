import React, { useLayoutEffect, useRef } from "react";

/**
 * Fee slips (bills, receipts) printed four to an A4 portrait page.
 *
 * Each slip gets a quarter of the page (A6: 105 x 148.5 mm) with dashed cut
 * lines between them. A slip whose content is taller than its quarter is zoomed
 * down until it fits (never below MIN_ZOOM), the same way useFitToPage keeps a
 * report card on one page. On screen the pages are shown as white A4 sheets.
 *
 * `children` is a list of slips; give each a key. One slip prints in the first
 * quarter of a single page.
 */
const MIN_ZOOM = 0.55;
const PER_PAGE = 4;

const FitSlot = ({ children }) => {
  const slotRef = useRef(null);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const inner = slot?.firstElementChild;
    if (!slot || !inner) return undefined;
    const fit = () => {
      inner.style.zoom = "";
      const style = window.getComputedStyle(slot);
      const limit = slot.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (!limit) return;
      let zoom = 1;
      for (let i = 0; i < 6; i += 1) {
        const height = inner.offsetHeight * zoom;
        if (height <= limit) break;
        zoom = Math.max(MIN_ZOOM, zoom * (limit / height) * 0.99);
        inner.style.zoom = String(zoom);
        if (zoom === MIN_ZOOM) break;
      }
    };
    fit();
    const images = [...inner.querySelectorAll("img")];
    images.forEach((img) => {
      img.addEventListener("load", fit);
      img.addEventListener("error", fit);
    });
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && fit());
    return () => {
      cancelled = true;
      images.forEach((img) => {
        img.removeEventListener("load", fit);
        img.removeEventListener("error", fit);
      });
    };
  });
  return (
    <div className="slip-slot" ref={slotRef}>
      <div className="slip-fit">{children}</div>
    </div>
  );
};

const SlipSheet = ({ children, className = "" }) => {
  const slips = React.Children.toArray(children);
  const pages = [];
  for (let i = 0; i < slips.length; i += PER_PAGE) pages.push(slips.slice(i, i + PER_PAGE));

  return (
    <div className={`slip-sheet ${className}`}>
      <style>{SLIP_STYLES}</style>
      {pages.map((page, p) => (
        <section className="slip-page" key={p} aria-label={`Page ${p + 1} of ${pages.length}`}>
          {page.map((slip, i) => (
            <FitSlot key={slip.key ?? i}>{slip}</FitSlot>
          ))}
        </section>
      ))}
    </div>
  );
};

const SLIP_STYLES = `
.slip-sheet { overflow-x: auto; }
.slip-page {
  width: 210mm;
  height: 297mm;
  margin: 0 auto 16px;
  display: grid;
  grid-template-columns: 105mm 105mm;
  grid-template-rows: 148.5mm 148.5mm;
  background: #fff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.15);
  color: #0f172a;
}
.slip-slot {
  box-sizing: border-box;
  height: 148.5mm;
  padding: 7mm 7mm 6mm;
  overflow: hidden;
  position: relative;
}
/* cut lines: right edge of the left column, bottom edge of the top row */
.slip-slot:nth-child(odd) { border-right: 1px dashed #94a3b8; }
.slip-slot:nth-child(-n + 2) { border-bottom: 1px dashed #94a3b8; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  .slip-sheet { overflow: visible; }
  .slip-page { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
  .slip-page:last-child { break-after: auto; page-break-after: auto; }
}
`;

export default SlipSheet;
