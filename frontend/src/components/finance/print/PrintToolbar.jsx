import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "../../ui";

/**
 * Back and Print buttons above a printable view; hidden when printing.
 * With `autoPrint` (the page was opened with ?print=1) the print dialog opens
 * once, as soon as `ready` is true.
 */
const PrintToolbar = ({ ready = true, autoPrint = false, children, printLabel = "Print" }) => {
  const navigate = useNavigate();
  const printed = useRef(false);

  useEffect(() => {
    if (!ready || !autoPrint || printed.current) return;
    printed.current = true;
    // Let images (the logo) load and slips fit before the dialog snapshots the page.
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [ready, autoPrint]);

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
        Back
      </Button>
      {children}
      <span className="flex-1" />
      <Button icon={Printer} onClick={() => window.print()} disabled={!ready}>
        {printLabel}
      </Button>
    </div>
  );
};

export default PrintToolbar;
