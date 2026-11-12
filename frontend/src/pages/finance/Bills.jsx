import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReceiptText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { Card, EmptyState, Field, LoadingBlock, SelectInput, TextInput } from "../../components/ui";
import PrintToolbar from "../../components/finance/print/PrintToolbar";
import SlipSheet from "../../components/finance/print/SlipSheet";
import BillSlip from "../../components/finance/print/BillSlip";

/**
 * Fee bills (due notices) for a class, four to an A4 page, ready to cut and
 * send home. Filters live in the URL: ?classId=&sectionId=&academicYearId=&dueBy=.
 * Only students who owe something get a bill.
 */
const Bills = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [state, setState] = useState({ data: null, error: "", loading: false });

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), academicService.getClasses()])
      .then(([y, c]) => {
        setYears(y.data || []);
        setClasses(c.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.classId) return setSections([]);
    academicService
      .getSections(params.classId)
      .then((res) => setSections(res.data || []))
      .catch(() => setSections([]));
  }, [params.classId]);

  const key = searchParams.toString();
  useEffect(() => {
    if (!params.classId) return setState({ data: null, error: "", loading: false });
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const query = {};
    for (const k of ["classId", "sectionId", "academicYearId", "dueBy"]) if (params[k]) query[k] = params[k];
    feeService
      .getBills(query)
      .then((res) => alive && setState({ data: res.data, error: "", loading: false }))
      .catch((err) => alive && setState({ data: null, error: err.response?.data?.message || "Could not load the bills", loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (k, v) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set(k, v);
        else next.delete(k);
        if (k === "classId") next.delete("sectionId");
        next.delete("print");
        return next;
      },
      { replace: true },
    );

  const { data } = state;
  const ready = Boolean(data && data.bills.length);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PrintToolbar ready={ready} autoPrint={params.print === "1"} printLabel={ready ? `Print ${data.bills.length} bill${data.bills.length === 1 ? "" : "s"}` : "Print"} />

      <Card className="print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">Fee bills</h1>
        <p className="text-sm text-slate-500">One bill per student who owes fees, four to an A4 page. Cut along the dashed lines.</p>
        <div className="mt-4 grid gap-x-4 sm:grid-cols-4">
          <Field label="Academic year" htmlFor="bill-year">
            <SelectInput id="bill-year" value={params.academicYearId || ""} onChange={(e) => set("academicYearId", e.target.value)}>
              <option value="">Current year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Class" htmlFor="bill-class">
            <SelectInput id="bill-class" value={params.classId || ""} onChange={(e) => set("classId", e.target.value)}>
              <option value="">Choose a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Section" htmlFor="bill-section">
            <SelectInput id="bill-section" value={params.sectionId || ""} onChange={(e) => set("sectionId", e.target.value)} disabled={!params.classId}>
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Fees due by" htmlFor="bill-due" hint="Empty: everything owed">
            <TextInput id="bill-due" type="date" value={params.dueBy || ""} onChange={(e) => set("dueBy", e.target.value)} />
          </Field>
        </div>
      </Card>

      {!params.classId ? (
        <Card className="print:hidden"><EmptyState icon={ReceiptText} title="Choose a class" description="Bills are printed for one class (or one section) at a time." /></Card>
      ) : state.error ? (
        <Card><EmptyState icon={ReceiptText} title="Bills not available" description={state.error} /></Card>
      ) : !data || state.loading ? (
        <LoadingBlock text="Loading bills…" />
      ) : data.bills.length === 0 ? (
        <Card><EmptyState icon={ReceiptText} title="Nobody owes fees" description="No student in this class has anything due for these filters." /></Card>
      ) : (
        <SlipSheet>
          {data.bills.map((b) => (
            <BillSlip key={b.studentClassId} bill={b} school={user?.school} billDate={data.billDate} billDateBs={data.billDateBs} academicYear={data.academicYear} dueBy={data.dueBy} />
          ))}
        </SlipSheet>
      )}
    </div>
  );
};

export default Bills;
