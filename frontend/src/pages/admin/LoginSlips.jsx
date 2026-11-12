import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { accountService } from "../../api/accountService";
import { academicService } from "../../api/academicService";
import { Alert, Button, Card, EmptyState, Field, SelectInput, confirmDialog, toast } from "../../components/ui";
import PrintToolbar from "../../components/finance/print/PrintToolbar";
import SlipSheet from "../../components/finance/print/SlipSheet";
import LoginSlip from "../../components/admin/LoginSlip";

/**
 * Class logins: give a class's students (and, if chosen, their parents)
 * temporary passwords and print login slips, four to an A4 page.
 *
 * The passwords exist only in this page's memory: leaving the page loses them
 * (the browser warns first), and the admin can generate again. A single
 * student's slip arrives here too, from the reset dialog (router state).
 */
const LoginSlips = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({ academicYearId: "", classId: "", sectionId: "", includeParents: false, onlyNeverSignedIn: true });
  const [credentials, setCredentials] = useState(() => location.state?.credentials || null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), academicService.getClasses()])
      .then(([y, c]) => {
        setYears(y.data || []);
        setClasses(c.data || []);
      })
      .catch(() => toast.error("Could not load years and classes"));
  }, []);

  useEffect(() => {
    if (!form.classId) return setSections([]);
    academicService
      .getSections(form.classId)
      .then((res) => setSections(res.data || []))
      .catch(() => setSections([]));
  }, [form.classId]);

  // Passwords on screen: warn before the tab is closed or reloaded.
  useEffect(() => {
    if (!credentials?.length) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [credentials]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === "classId" ? { sectionId: "" } : {}) }));

  const body = () => ({
    classId: Number(form.classId),
    ...(form.sectionId ? { sectionId: Number(form.sectionId) } : {}),
    ...(form.academicYearId ? { academicYearId: Number(form.academicYearId) } : {}),
    includeParents: form.includeParents,
    onlyNeverSignedIn: form.onlyNeverSignedIn,
  });

  const generate = async () => {
    if (!form.classId) return toast.error("Choose a class");
    setBusy(true);
    try {
      const preview = (await accountService.classLogins({ ...body(), dryRun: true })).data;
      const n = preview.students + preview.parents;
      if (n === 0) {
        toast.info("Nobody to give a password to with these choices");
        return;
      }
      const skipped = preview.skipped.signedIn
        ? ` ${preview.skipped.signedIn} account(s) that have already signed in are left alone.`
        : "";
      const ok = await confirmDialog({
        title: `Give ${n} account${n === 1 ? "" : "s"} a new password?`,
        message: `${preview.students} student(s)${form.includeParents ? ` and ${preview.parents} parent(s)` : ""} get a temporary password and must choose their own at the next sign-in. Their current passwords stop working.${skipped}`,
        confirmLabel: "Create passwords",
        tone: "danger",
      });
      if (!ok) return;
      const res = await accountService.classLogins(body());
      setCredentials(res.data.credentials);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create the passwords");
    } finally {
      setBusy(false);
    }
  };

  const signInAt = `${window.location.origin}/login`;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PrintToolbar ready={Boolean(credentials?.length)} printLabel={credentials?.length ? `Print ${credentials.length} slip${credentials.length === 1 ? "" : "s"}` : "Print"} />

      <Card className="print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">Class logins</h1>
        <p className="text-sm text-slate-500">
          Temporary passwords for a class, printed four to an A4 page. Everyone chooses their own password the first time they sign in.
        </p>
        <div className="mt-4 grid gap-x-4 sm:grid-cols-3">
          <Field label="Academic year" htmlFor="ls-year">
            <SelectInput id="ls-year" value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}>
              <option value="">Current year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Class" htmlFor="ls-class">
            <SelectInput id="ls-class" value={form.classId} onChange={(e) => set("classId", e.target.value)}>
              <option value="">Choose a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Section" htmlFor="ls-section">
            <SelectInput id="ls-section" value={form.sectionId} onChange={(e) => set("sectionId", e.target.value)} disabled={!form.classId}>
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-1 flex flex-col gap-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={form.includeParents} onChange={(e) => set("includeParents", e.target.checked)} />
            Parents too
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={form.onlyNeverSignedIn} onChange={(e) => set("onlyNeverSignedIn", e.target.checked)} />
            Only accounts that have never signed in (recommended: others keep their password)
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button icon={KeyRound} onClick={generate} loading={busy} disabled={!form.classId}>
            Create passwords
          </Button>
        </div>
      </Card>

      {credentials?.length > 0 ? (
        <>
          <Alert tone="warning" className="print:hidden">
            These passwords are shown only now. Print the slips before leaving this page.
          </Alert>
          <SlipSheet>
            {credentials.map((c) => (
              <LoginSlip key={c.userId} credential={c} school={user?.school} signInAt={signInAt} />
            ))}
          </SlipSheet>
        </>
      ) : (
        <Card className="print:hidden">
          <EmptyState icon={KeyRound} title="No slips yet" description="Choose a class and create passwords to print login slips." />
        </Card>
      )}
    </div>
  );
};

export default LoginSlips;
