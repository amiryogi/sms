import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ReceiptText } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { feeService } from "../../../api/feeService";
import { Card, EmptyState, LoadingBlock } from "../../ui";
import PrintToolbar from "./PrintToolbar";
import StatementSheet from "./StatementSheet";
import SlipSheet from "./SlipSheet";
import BillSlip from "./BillSlip";

/**
 * Printable fee views for one student, shared by the finance pages and the
 * student and parent portals. The API decides who may read which student.
 */

const useLoad = (fetcher, deps) => {
  const [state, setState] = useState({ data: null, error: "" });
  useEffect(() => {
    let alive = true;
    setState({ data: null, error: "" });
    fetcher()
      .then((res) => alive && setState({ data: res.data, error: "" }))
      .catch((err) => alive && setState({ data: null, error: err.response?.data?.message || "Could not load" }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

/** A student's fee statement on A4. */
export const StatementPrint = ({ studentId }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data, error } = useLoad(() => feeService.getStatement(studentId), [studentId]);
  if (error) return <Card><EmptyState icon={FileText} title="Statement not available" description={error} /></Card>;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PrintToolbar ready={Boolean(data)} autoPrint={searchParams.get("print") === "1"} printLabel="Print statement" />
      {data ? <StatementSheet statement={data} school={user?.school} /> : <LoadingBlock text="Loading statement…" />}
    </div>
  );
};

/** A student's fee bill (due notice) on a quarter of A4. */
export const StudentBillPrint = ({ studentId }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data, error } = useLoad(() => feeService.getStudentBill(studentId), [studentId]);
  if (error) return <Card><EmptyState icon={ReceiptText} title="Bill not available" description={error} /></Card>;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PrintToolbar ready={Boolean(data)} autoPrint={searchParams.get("print") === "1"} printLabel="Print bill" />
      {data ? (
        <SlipSheet>
          <BillSlip key={data.bill.studentId} bill={data.bill} school={user?.school} billDate={data.billDate} billDateBs={data.billDateBs} academicYear={data.academicYear} dueBy={data.dueBy} />
        </SlipSheet>
      ) : (
        <LoadingBlock text="Loading bill…" />
      )}
    </div>
  );
};
