import { useEffect, useMemo, useState } from "react";
import { Bot, Cpu, BarChart3, PlugZap, Save, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, LoadingBlock, PageHeader, SelectInput, Switch, Tabs, TextInput, toast } from "../../components/ui";
import { assistantService } from "../../api/assistantService";
import { formatRoleName } from "../../layouts/navigation";
import { formatDateTime, formatNumber, formatShortDay, todayAd } from "../../utils/format";
import { AXIS, SERIES, STATUS_COLORS } from "../../components/finance/charts/chartTheme";

/**
 * Settings → AI Assistant (administrators and super administrators).
 *  - Assistant: on/off, which roles may use it, default language, history and limits.
 *  - AI provider: provider and model (only providers whose API key is installed on the server),
 *    Test connection, the optional fallback, timeout and answer length.
 *  - Usage: questions, tokens, estimated cost, errors, provider health and feedback.
 * API keys are never shown or entered here: the server's maintainer installs them.
 */
const ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"];
const CUSTOM = "__custom__";
const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];
const ERROR_LABELS = {
  auth: "Key rejected",
  not_configured: "No key installed",
  model_not_found: "Model not available",
  rate_limited: "Provider busy (rate limit)",
  timeout: "Too slow (timeout)",
  unavailable: "Provider unreachable",
  bad_request: "Request refused",
  content_filtered: "Declined by the provider",
  unknown: "Other error",
};

/** "YYYY-MM-DD" `days - 1` days before today (Nepal), for the usage range. */
const daysBack = (days) => new Date(Date.parse(`${todayAd()}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
const num = (value) => (value === "" || value === null ? NaN : Number(value));

export default function AssistantSettings() {
  const [tab, setTab] = useState("assistant");
  const [info, setInfo] = useState(null); // { settings, providers, serverEnabled, fakeProvider }
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    assistantService
      .getSettings()
      .then((res) => {
        setInfo(res.data.data);
        setForm(res.data.data.settings);
      })
      .catch(() => setLoadError(true));
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setFallback = (patch) => setForm((prev) => ({ ...prev, fallback: { ...prev.fallback, ...patch } }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const body = { ...form };
      for (const key of ["timeoutMs", "maxOutputTokens", "temperature", "retentionDays", "userDailyLimit", "monthlyTokenBudget"]) body[key] = num(form[key]);
      const res = await assistantService.updateSettings(body);
      setInfo((prev) => ({ ...prev, settings: res.data.data.settings, providers: res.data.data.providers }));
      setForm(res.data.data.settings);
      toast.success("Assistant settings saved");
    } catch (error) {
      const list = error.response?.data?.errors || [];
      setErrors(Object.fromEntries(list.map((e) => [e.field, e.message])));
      toast.error(error.response?.data?.message || "Could not save the settings");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <Alert tone="danger">Could not load the assistant settings.</Alert>;
  if (!info || !form) return <LoadingBlock text="Loading assistant settings…" />;

  const dirty = JSON.stringify(form) !== JSON.stringify(info.settings);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title="AI Assistant"
        description="The help assistant explains how to use this system. It never sees or changes school records."
        actions={
          tab !== "usage" && (
            <Button icon={Save} loading={saving} disabled={!dirty} onClick={save}>
              Save settings
            </Button>
          )
        }
      />

      {!info.serverEnabled && <Alert tone="warning">The assistant is switched off on this server (ASSISTANT_ENABLED=false). These settings take effect when it is switched back on.</Alert>}
      {info.fakeProvider && <Alert tone="info">Test mode: answers are canned text and no AI provider is called (ASSISTANT_FAKE_PROVIDER).</Alert>}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "assistant", label: "Assistant", icon: Bot },
          { value: "provider", label: "AI provider", icon: Cpu },
          { value: "usage", label: "Usage", icon: BarChart3 },
        ]}
      />

      {tab === "assistant" && <AssistantTab form={form} set={set} errors={errors} />}
      {tab === "provider" && <ProviderTab form={form} set={set} setFallback={setFallback} errors={errors} providers={info.providers} />}
      {tab === "usage" && <UsageTab />}
    </div>
  );
}

function AssistantTab({ form, set, errors }) {
  const toggleRole = (role) => set({ roles: form.roles.includes(role) ? form.roles.filter((r) => r !== role) : ROLES.filter((r) => r === role || form.roles.includes(r)) });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Who can use it" description="Switch the assistant off, or offer it only to some roles." />
        <div className="space-y-4">
          <Switch id="ai-enabled" checked={form.enabled} onChange={(v) => set({ enabled: v })} label="Help assistant is on" description="Off hides the help button for everyone in the school." />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Roles</legend>
            {ROLES.map((role) => (
              <Checkbox key={role} id={`role-${role}`} label={formatRoleName(role)} checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />
            ))}
            {errors.roles && <p className="text-xs text-red-600">{errors.roles}</p>}
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader title="Language" description="Each person can still choose Auto, English or नेपाली in the help panel." />
        <div className="space-y-4">
          <Field label="Default answer language" htmlFor="ai-lang" error={errors.defaultLanguage} hint="Used for people who have not chosen a language themselves.">
            <SelectInput id="ai-lang" value={form.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}>
              <option value="auto">Auto: the language of the question</option>
              <option value="en">English</option>
              <option value="ne">नेपाली (Nepali)</option>
            </SelectInput>
          </Field>
          <Switch id="ai-detect" checked={form.autoDetect} onChange={(v) => set({ autoDetect: v })} label="Detect the question's language" description="On Auto, a question in Nepali (or Nepali in Latin letters) is answered in Nepali." />
        </div>
      </Card>

      <Card>
        <CardHeader title="History" description="Conversations belong to the person who had them; nobody else can read them." />
        <Field label="Keep conversations for (days)" htmlFor="ai-retention" error={errors.retentionDays} hint="Older conversations are deleted automatically (1 to 730 days).">
          <TextInput id="ai-retention" type="number" min={1} max={730} value={form.retentionDays} onChange={(e) => set({ retentionDays: e.target.value })} />
        </Field>
      </Card>

      <Card>
        <CardHeader title="Limits" description="Keep the cost of the AI provider under control." />
        <div className="space-y-4">
          <Field label="Questions per person per day" htmlFor="ai-daily" error={errors.userDailyLimit}>
            <TextInput id="ai-daily" type="number" min={1} max={1000} value={form.userDailyLimit} onChange={(e) => set({ userDailyLimit: e.target.value })} />
          </Field>
          <Field label="Tokens per month for the school (0 = no limit)" htmlFor="ai-budget" error={errors.monthlyTokenBudget} hint="A typical question uses about 2,000 to 4,000 tokens.">
            <TextInput id="ai-budget" type="number" min={0} value={form.monthlyTokenBudget} onChange={(e) => set({ monthlyTokenBudget: e.target.value })} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function ModelPicker({ id, provider, value, onChange, error }) {
  const models = provider?.models || [];
  const known = models.some((m) => m.id === value);
  const [custom, setCustom] = useState(!known && !!value);
  return (
    <div className="space-y-2">
      <Field label="Model" htmlFor={id} error={error}>
        <SelectInput
          id={id}
          value={custom ? CUSTOM : value}
          onChange={(e) => {
            if (e.target.value === CUSTOM) setCustom(true);
            else {
              setCustom(false);
              onChange(e.target.value);
            }
          }}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.price ? ` — $${m.price.input} / $${m.price.output} per million tokens` : ""}
            </option>
          ))}
          <option value={CUSTOM}>Another model id…</option>
        </SelectInput>
      </Field>
      {custom && (
        <Field label="Model id" htmlFor={`${id}-custom`} hint="As the provider names it. Check it with Test connection.">
          <TextInput id={`${id}-custom`} value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="model-id" />
        </Field>
      )}
    </div>
  );
}

function TestConnection({ provider, model, disabled }) {
  const [state, setState] = useState(null);
  const run = async () => {
    setState({ loading: true });
    try {
      const res = await assistantService.testProvider(provider, model);
      setState(res.data.data);
    } catch (error) {
      setState({ ok: false, error: { message: error.response?.data?.message || "The test could not run." } });
    }
  };
  return (
    <div className="space-y-2">
      <Button variant="secondary" icon={PlugZap} loading={state?.loading} disabled={disabled || !model} onClick={run}>
        Test connection
      </Button>
      {state && !state.loading && (
        <Alert tone={state.ok ? "success" : "danger"}>
          {state.ok ? `Works: answered "${state.sample}" in ${(state.latencyMs / 1000).toFixed(1)} s.` : state.error?.message}
        </Alert>
      )}
    </div>
  );
}

function ProviderTab({ form, set, setFallback, errors, providers }) {
  const byId = useMemo(() => Object.fromEntries(providers.map((p) => [p.id, p])), [providers]);
  const main = byId[form.provider];
  const fb = byId[form.fallback.provider];
  const providerOptions = providers.map((p) => (
    <option key={p.id} value={p.id} disabled={!p.keyConfigured}>
      {p.label}
      {p.keyConfigured ? "" : " (no API key on the server)"}
    </option>
  ));
  const firstModel = (id) => byId[id]?.models?.[0]?.id || "";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Main provider" description="Answers come from this provider and model." />
          <div className="space-y-4">
            <Field label="Provider" htmlFor="ai-provider" error={errors.provider}>
              <SelectInput id="ai-provider" value={form.provider} onChange={(e) => set({ provider: e.target.value, model: firstModel(e.target.value) })}>
                {providerOptions}
              </SelectInput>
            </Field>
            <ModelPicker key={form.provider} id="ai-model" provider={main} value={form.model} onChange={(model) => set({ model })} error={errors.model} />
            {main?.dataNote && <p className="text-xs text-slate-500">{main.dataNote}</p>}
            <TestConnection provider={form.provider} model={form.model} disabled={!main?.keyConfigured} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Fallback" description="Used only when the main provider fails before answering (busy, unreachable, key or model problem). Never after an answer has started, never twice." />
          <div className="space-y-4">
            <Switch id="ai-fallback" checked={form.fallback.enabled} onChange={(v) => setFallback({ enabled: v })} label="Use a fallback provider" />
            {errors.fallback && <p className="text-xs text-red-600">{errors.fallback}</p>}
            {form.fallback.enabled && (
              <>
                <Field label="Fallback provider" htmlFor="ai-fb-provider" error={errors["fallback.provider"]}>
                  <SelectInput id="ai-fb-provider" value={form.fallback.provider} onChange={(e) => setFallback({ provider: e.target.value, model: firstModel(e.target.value) })}>
                    {providerOptions}
                  </SelectInput>
                </Field>
                <ModelPicker key={form.fallback.provider} id="ai-fb-model" provider={fb} value={form.fallback.model} onChange={(model) => setFallback({ model })} error={errors["fallback.model"]} />
                {fb?.dataNote && <p className="text-xs text-slate-500">{fb.dataNote}</p>}
                <TestConnection provider={form.fallback.provider} model={form.fallback.model} disabled={!fb?.keyConfigured} />
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Answers" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Timeout (seconds)" htmlFor="ai-timeout" error={errors.timeoutMs}>
              <TextInput id="ai-timeout" type="number" min={5} max={120} value={Math.round(num(form.timeoutMs) / 1000) || ""} onChange={(e) => set({ timeoutMs: num(e.target.value) * 1000 })} />
            </Field>
            <Field label="Longest answer (tokens)" htmlFor="ai-maxtokens" error={errors.maxOutputTokens}>
              <TextInput id="ai-maxtokens" type="number" min={200} max={8000} value={form.maxOutputTokens} onChange={(e) => set({ maxOutputTokens: e.target.value })} />
            </Field>
            <Field label="Temperature" htmlFor="ai-temp" error={errors.temperature} hint="0 = same answer each time. Ignored by models that do not accept it.">
              <TextInput id="ai-temp" type="number" min={0} max={1} step={0.1} value={form.temperature} onChange={(e) => set({ temperature: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="API keys on this server" description="Keys are set in the server's environment by its maintainer, never here, and are never shown." />
          <ul className="divide-y divide-slate-100 text-sm">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {p.label} <code className="ml-1 text-xs text-slate-500">{p.envKey}</code>
                </span>
                <Badge tone={p.keyConfigured ? "success" : "neutral"}>{p.keyConfigured ? "Installed" : "Not installed"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function UsageTab() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    assistantService
      .getUsage({ from: daysBack(Number(range)), to: todayAd() })
      .then((res) => {
        if (!alive) return;
        setData(res.data.data);
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [range]);

  if (failed) return <Alert tone="danger">Could not load the usage figures.</Alert>;
  if (!data) return <LoadingBlock text="Loading usage…" />;
  const { totals } = data;
  const chart = data.byDay.map((d) => ({ day: formatShortDay(d.date), Answered: d.answered, Failed: d.errors }));

  return (
    <div className="space-y-6">
      <div className="w-56">
        <Field label="Period" htmlFor="ai-range">
          <SelectInput id="ai-range" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Questions" value={formatNumber(totals.requests)} sub={`${formatNumber(totals.errors)} failed, ${formatNumber(totals.aborted)} stopped`} />
        <Stat label="Tokens" value={formatNumber(totals.inputTokens + totals.outputTokens)} sub={`${formatNumber(totals.inputTokens)} in, ${formatNumber(totals.outputTokens)} out`} />
        <Stat label="Estimated cost" value={`$${totals.estimatedCostUsd.toFixed(2)}`} sub={totals.costKnown ? "From list prices" : "Free tiers and unknown prices are not counted"} />
        <Stat label="Feedback" value={`${totals.thumbsUp} / ${totals.thumbsDown}`} sub={`helpful / not helpful · ${totals.fallbacks} answered by the fallback`} />
      </div>

      {totals.requests === 0 ? (
        <EmptyState icon={BarChart3} title="No questions in this period" description="Figures appear once people use the help assistant." />
      ) : (
        <>
          <Card>
            <CardHeader title="Questions per day" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={AXIS.grid} />
                  <XAxis dataKey="day" tick={AXIS.tick} stroke={AXIS.line} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS.tick} stroke={AXIS.line} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Answered" stackId="a" fill={SERIES.collected} maxBarSize={48} isAnimationActive={false} />
                  <Bar dataKey="Failed" stackId="a" fill={STATUS_COLORS.overdue} maxBarSize={48} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Providers" description={`Average answer time ${(totals.avgLatencyMs / 1000).toFixed(1)} s`} />
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-1.5 font-medium">Provider</th>
                    <th className="py-1.5 text-right font-medium">Questions</th>
                    <th className="py-1.5 text-right font-medium">Failed</th>
                    <th className="py-1.5 pl-3 font-medium">Last answer / last error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byProvider.map((p) => (
                    <tr key={p.provider}>
                      <td className="py-2">{p.label}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(p.requests)}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(p.errors)}</td>
                      <td className="py-2 pl-3 text-xs text-slate-500">
                        {p.lastOkAt ? formatDateTime(p.lastOkAt) : "—"}
                        {p.lastErrorAt && (
                          <span className="block text-red-600">
                            {formatDateTime(p.lastErrorAt)}: {ERROR_LABELS[p.lastErrorCode] || p.lastErrorCode}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <CardHeader title="By role and language" />
              <ul className="space-y-1.5 text-sm">
                {data.byRole.map((r) => (
                  <li key={r.role} className="flex justify-between">
                    <span>{formatRoleName(r.role)}</span>
                    <span className="tabular-nums">{formatNumber(r.requests)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">{data.byLanguage.map((l) => `${l.language === "ne" ? "Nepali" : "English"}: ${formatNumber(l.requests)}`).join(" · ")}</p>
            </Card>
          </div>

          {data.errorsByCode.length > 0 && (
            <Card>
              <CardHeader title="Errors" />
              <ul className="space-y-1.5 text-sm">
                {data.errorsByCode.map((e) => (
                  <li key={e.code} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" aria-hidden="true" />
                      {ERROR_LABELS[e.code] || e.code}
                    </span>
                    <span className="tabular-nums">{formatNumber(e.count)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader title="Comments from users" description="What people wrote with a thumbs up or down. Names are not shown." />
        {data.comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments in this period.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.comments.map((c) => (
              <li key={c.id} className="flex gap-3 py-2.5 text-sm">
                {c.feedback > 0 ? <ThumbsUp size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Helpful" /> : <ThumbsDown size={16} className="mt-0.5 shrink-0 text-red-600" aria-label="Not helpful" />}
                <div className="min-w-0">
                  <p className="break-words text-slate-800">{c.feedbackComment}</p>
                  <p className="text-xs text-slate-500">
                    {formatRoleName(c.role)} · {formatDateTime(c.createdAt)}
                    {c.module ? ` · ${c.module}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}
