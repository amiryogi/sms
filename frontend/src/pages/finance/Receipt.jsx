import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { feeService } from "../../api/feeService";
import { Button, Card, EmptyState, LoadingBlock } from "../../components/ui";
import ReceiptSheet from "../../components/finance/ReceiptSheet";
import ReceiptSlip from "../../components/finance/print/ReceiptSlip";
import SlipSheet from "../../components/finance/print/SlipSheet";

/**
 * One receipt. On screen: the full receipt. Printed: a quarter-A4 slip (the
 * same facts, set small), so receipts do not use a whole sheet each.
 * ?print=1 opens the print dialog once loaded.
 * Students and parents can open their own receipts here too; the API checks.
 */
const Receipt = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const printed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    feeService
      .getTransaction(id)
      .then((res) => !cancelled && setReceipt(res.data))
      .catch((err) => !cancelled && setError(err.response?.data?.message || "Could not load the receipt"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (receipt && searchParams.get("print") === "1" && !printed.current) {
      printed.current = true;
      // Let images (the school logo) load before the print dialog snapshots the page.
      setTimeout(() => window.print(), 400);
    }
  }, [receipt, searchParams]);

  if (error) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState icon={ReceiptText} title="Receipt not available" description={error} />
      </Card>
    );
  }
  if (!receipt) return <LoadingBlock text="Loading receipt…" />;

  const isStaff = hasRole("ADMIN") || hasRole("ACCOUNTANT");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
        {isStaff && (
          <Link to={`/finance/accounts/${receipt.studentId}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Student account
          </Link>
        )}
        <span className="flex-1" />
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>
      <div className="print:hidden">
        <ReceiptSheet receipt={receipt} school={user?.school} />
      </div>
      {/* Laid out off-screen so the slip is measured (and shrunk to fit) before printing. */}
      <div className="receipt-print" aria-hidden="true">
        <style>{".receipt-print { position: absolute; left: -10000px; top: 0; } @media print { .receipt-print { position: static; } }"}</style>
        <SlipSheet>
          <ReceiptSlip key={receipt.id} receipt={receipt} school={user?.school} />
        </SlipSheet>
      </div>
    </div>
  );
};

export default Receipt;
