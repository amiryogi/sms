import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Button, Checkbox, Dialog, DialogActions, Field, IconButton, NepaliDatePicker, SelectInput, Switch, TextArea, TextInput, toast } from "../ui";
import { calendarService } from "../../api/calendarService";
import { academicService } from "../../api/academicService";
import { teacherService } from "../../api/teacherService";
import { useAuth } from "../../context/AuthContext";
import { categoryMeta, RECURRENCE_OPTIONS, ROLE_LABELS } from "../../lib/calendar/calendarConstants";

const HOLIDAY_CATEGORIES = ["PUBLIC_HOLIDAY", "LOCAL_HOLIDAY", "SCHOOL_HOLIDAY"];
const TEACHER_CATEGORIES = ["ACADEMIC_ACTIVITY", "ASSIGNMENT_DEADLINE", "PARENT_TEACHER_MEETING", "SCHOOL_EVENT", "SPORTS_EVENT", "OTHER"];
const EVENT_CATEGORIES = ["SCHOOL_EVENT", "EXAMINATION", "PARENT_TEACHER_MEETING", "SPORTS_EVENT", "ACADEMIC_ACTIVITY", "ADMISSION_DEADLINE", "FEE_DEADLINE", "ASSIGNMENT_DEADLINE", "STAFF_MEETING", "OTHER"];
const AUDIENCE_ROLES = ["TEACHER", "STUDENT", "PARENT", "EXAM_OFFICER", "ACCOUNTANT", "ADMIN"];

const blank = (kind, isAdmin, date) => ({
  title: "",
  description: "",
  category: kind === "holiday" ? "SCHOOL_HOLIDAY" : isAdmin ? "SCHOOL_EVENT" : "ACADEMIC_ACTIVITY",
  startDate: date || "",
  endDate: date || "",
  isAllDay: true,
  startTime: "10:00",
  endTime: "",
  recurrence: "NONE",
  recurrenceUntil: "",
  audienceType: isAdmin ? "ALL" : "CLASS",
  roles: [],
  classTargets: [{ classId: "", sectionId: "" }],
  status: "PUBLISHED",
  isActive: true,
  source: "",
  sourceDocument: "",
  sourcePublishedDate: "",
  applicability: "",
  notify: false,
});

const fromEvent = (event) => ({
  title: event.title || "",
  description: event.description || "",
  category: event.category,
  startDate: event.startDate,
  endDate: event.endDate,
  isAllDay: event.isAllDay,
  startTime: event.startTime || "10:00",
  endTime: event.endTime || "",
  recurrence: event.recurrence || "NONE",
  recurrenceUntil: event.recurrenceUntil || "",
  audienceType: event.audienceType,
  roles: event.roles || [],
  classTargets: event.classTargets?.length ? event.classTargets.map((t) => ({ classId: String(t.classId), sectionId: t.sectionId ? String(t.sectionId) : "" })) : [{ classId: "", sectionId: "" }],
  status: event.status,
  isActive: event.isActive,
  source: event.source || "",
  sourceDocument: event.sourceDocument || "",
  sourcePublishedDate: event.sourcePublishedDate || "",
  applicability: event.applicability || "",
  notify: false,
});

/**
 * Add or edit a calendar event or holiday.
 *
 * `kind` ("event" | "holiday") only chooses which categories are offered; the
 * server decides what the person may save (a teacher: class events for the
 * sections they teach). `event` is the row to edit, or null for a new one;
 * `defaultDate` prefills a new one. onSaved() is called after a save.
 */
const EventDialog = ({ open, onClose, onSaved, event = null, kind = "event", defaultDate = "" }) => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [form, setForm] = useState(() => blank(kind, isAdmin, defaultDate));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [taught, setTaught] = useState([]); // teacher: [{ classId, className, sectionId, sectionName }]

  useEffect(() => {
    if (!open) return;
    setForm(event ? fromEvent(event) : blank(kind, isAdmin, defaultDate));
    setErrors({});
  }, [open, event, kind, isAdmin, defaultDate]);

  useEffect(() => {
    if (!open) return;
    if (isAdmin) {
      Promise.all([academicService.getClasses(), academicService.getSections()])
        .then(([c, s]) => {
          setClasses(c.data || []);
          setSections(s.data || []);
        })
        .catch(() => toast.error("Could not load classes"));
    } else {
      teacherService
        .getTeacherAssignments({ userId: user?.id })
        .then((res) => {
          const seen = new Map();
          for (const a of res.data || []) {
            const key = `${a.classSubject?.classId}-${a.sectionId}`;
            if (!seen.has(key)) seen.set(key, { classId: a.classSubject?.classId, className: a.classSubject?.class?.name, sectionId: a.sectionId, sectionName: a.section?.name });
          }
          setTaught([...seen.values()]);
        })
        .catch(() => toast.error("Could not load your classes"));
    }
  }, [open, isAdmin, user?.id]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const isHoliday = HOLIDAY_CATEGORIES.includes(form.category);
  const categories = useMemo(() => {
    const list = !isAdmin ? TEACHER_CATEGORIES : kind === "holiday" ? HOLIDAY_CATEGORIES : EVENT_CATEGORIES;
    return list.includes(form.category) ? list : [form.category, ...list];
  }, [isAdmin, kind, form.category]);

  const setTarget = (index, patch) => set({ classTargets: form.classTargets.map((t, i) => (i === index ? { ...t, ...patch } : t)) });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.title.trim()) local.title = "Give it a name";
    if (!form.startDate) local.startDate = "Choose a date";
    if (form.endDate && form.startDate && form.endDate < form.startDate) local.endDate = "The end date cannot be before the start date";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      isAllDay: form.isAllDay,
      startTime: form.isAllDay ? null : form.startTime,
      endTime: form.isAllDay ? null : form.endTime || null,
      recurrence: form.recurrence,
      recurrenceUntil: form.recurrence === "NONE" ? null : form.recurrenceUntil || null,
      audienceType: form.audienceType,
      roles: form.audienceType === "ROLE" ? form.roles : [],
      classTargets:
        form.audienceType === "CLASS"
          ? form.classTargets.filter((t) => t.classId).map((t) => ({ classId: Number(t.classId), sectionId: t.sectionId ? Number(t.sectionId) : null }))
          : [],
      status: form.status,
      isActive: form.isActive,
      notify: form.notify,
      ...(isHoliday ? { source: form.source, sourceDocument: form.sourceDocument, sourcePublishedDate: form.sourcePublishedDate, applicability: form.applicability } : {}),
    };

    setSaving(true);
    try {
      if (event) await calendarService.updateEvent(event.id, payload);
      else await calendarService.createEvent(payload);
      toast.success(event ? "Saved" : isHoliday ? "Holiday added" : "Event added");
      onSaved?.();
      onClose();
    } catch (error) {
      const list = error.response?.data?.errors || [];
      if (list.length) setErrors(Object.fromEntries(list.map((x) => [x.field.replace(/\[.*$/, ""), x.message])));
      toast.error(error.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={event ? (isHoliday ? "Edit holiday" : "Edit event") : kind === "holiday" ? "Add a holiday" : "Add an event"}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" htmlFor="ev-title" error={errors.title} required>
          <TextInput id="ev-title" data-autofocus value={form.title} maxLength={255} invalid={Boolean(errors.title)} onChange={(e) => set({ title: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="ev-category" error={errors.category}>
            <SelectInput id="ev-category" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryMeta(c).label}</option>
              ))}
            </SelectInput>
          </Field>
          {isAdmin ? (
            <Field label="Shown to people" htmlFor="ev-status" hint={form.status === "DRAFT" ? "A draft is seen only by administrators" : undefined}>
              <SelectInput id="ev-status" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </SelectInput>
            </Field>
          ) : (
            <div />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" htmlFor="ev-start" error={errors.startDate} required>
            <NepaliDatePicker
              id="ev-start"
              value={form.startDate}
              invalid={Boolean(errors.startDate)}
              clearable={false}
              onChange={(ad) => set({ startDate: ad, endDate: !form.endDate || form.endDate < ad || form.endDate === form.startDate ? ad : form.endDate })}
            />
          </Field>
          <Field label="Ends" htmlFor="ev-end" error={errors.endDate} hint="The same day for a one-day event">
            <NepaliDatePicker id="ev-end" value={form.endDate} min={form.startDate || undefined} invalid={Boolean(errors.endDate)} clearable={false} onChange={(ad) => set({ endDate: ad })} />
          </Field>
        </div>

        <Switch id="ev-allday" checked={form.isAllDay} onChange={(v) => set({ isAllDay: v })} label="All day" description="Switch off to give a start and end time" />
        {!form.isAllDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start time" htmlFor="ev-start-time" error={errors.startTime}>
              <TextInput id="ev-start-time" type="time" value={form.startTime} invalid={Boolean(errors.startTime)} onChange={(e) => set({ startTime: e.target.value })} />
            </Field>
            <Field label="End time" htmlFor="ev-end-time" error={errors.endTime} hint="Optional">
              <TextInput id="ev-end-time" type="time" value={form.endTime} invalid={Boolean(errors.endTime)} onChange={(e) => set({ endTime: e.target.value })} />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repeats" htmlFor="ev-repeat" error={errors.recurrence}>
            <SelectInput id="ev-repeat" value={form.recurrence} onChange={(e) => set({ recurrence: e.target.value })}>
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </SelectInput>
          </Field>
          {form.recurrence !== "NONE" && (
            <Field label="Repeat until" htmlFor="ev-until" error={errors.recurrenceUntil} hint="Empty: no end">
              <NepaliDatePicker id="ev-until" value={form.recurrenceUntil} min={form.startDate || undefined} onChange={(ad) => set({ recurrenceUntil: ad })} placeholder="No end" />
            </Field>
          )}
        </div>

        {/* Who it is for */}
        <fieldset className="rounded-xl border border-slate-200 p-3.5">
          <legend className="px-1 text-sm font-medium text-slate-700">Who is it for?</legend>
          {isAdmin && (
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {[
                ["ALL", "Everyone in the school"],
                ["ROLE", "Certain roles"],
                ["CLASS", "Certain classes"],
              ].map(([value, label]) => (
                <label key={value} className="inline-flex cursor-pointer items-center gap-2">
                  <input type="radio" name="ev-audience" className="size-4 accent-brand-600" checked={form.audienceType === value} onChange={() => set({ audienceType: value })} />
                  {label}
                </label>
              ))}
            </div>
          )}
          {form.audienceType === "ROLE" && (
            <div className="grid gap-2 sm:grid-cols-3">
              {AUDIENCE_ROLES.map((role) => (
                <Checkbox
                  key={role}
                  id={`ev-role-${role}`}
                  label={ROLE_LABELS[role]}
                  checked={form.roles.includes(role)}
                  onChange={(e) => set({ roles: e.target.checked ? [...form.roles, role] : form.roles.filter((r) => r !== role) })}
                />
              ))}
            </div>
          )}
          {form.audienceType === "CLASS" && (
            <div className="space-y-2">
              {form.classTargets.map((target, index) => (
                <div key={index} className="flex items-center gap-2">
                  {isAdmin ? (
                    <>
                      <SelectInput aria-label={`Class ${index + 1}`} value={target.classId} onChange={(e) => setTarget(index, { classId: e.target.value })}>
                        <option value="">Select a class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </SelectInput>
                      <SelectInput aria-label={`Section ${index + 1}`} value={target.sectionId} onChange={(e) => setTarget(index, { sectionId: e.target.value })}>
                        <option value="">All sections</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>Section {s.name}</option>
                        ))}
                      </SelectInput>
                    </>
                  ) : (
                    <SelectInput
                      aria-label={`Class ${index + 1}`}
                      value={target.classId && target.sectionId ? `${target.classId}-${target.sectionId}` : ""}
                      onChange={(e) => {
                        const [classId = "", sectionId = ""] = e.target.value.split("-");
                        setTarget(index, { classId, sectionId });
                      }}
                    >
                      <option value="">{taught.length ? "Select one of your classes" : "No classes assigned to you"}</option>
                      {taught.map((t) => (
                        <option key={`${t.classId}-${t.sectionId}`} value={`${t.classId}-${t.sectionId}`}>{t.className} {t.sectionName}</option>
                      ))}
                    </SelectInput>
                  )}
                  {form.classTargets.length > 1 && (
                    <IconButton icon={Trash2} label="Remove this class" variant="ghost" onClick={() => set({ classTargets: form.classTargets.filter((_, i) => i !== index) })} />
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={() => set({ classTargets: [...form.classTargets, { classId: "", sectionId: "" }] })}>
                Add another class
              </Button>
            </div>
          )}
          {(errors.classTargets || errors.roles || errors.audienceType) && (
            <p className="mt-2 text-xs font-medium text-red-600" role="alert">{errors.classTargets || errors.roles || errors.audienceType}</p>
          )}
          {isHoliday && form.audienceType === "ROLE" && (
            <Alert tone="info" className="mt-3">A holiday for certain roles appears on their calendar but does not close any class.</Alert>
          )}
        </fieldset>

        <Field label="Details" htmlFor="ev-description" hint="Optional" error={errors.description}>
          <TextArea id="ev-description" rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        {isHoliday && isAdmin && (
          <fieldset className="space-y-4 rounded-xl border border-slate-200 p-3.5">
            <legend className="px-1 text-sm font-medium text-slate-700">Where this holiday comes from</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source" htmlFor="ev-source" hint="For example: Ministry of Home Affairs">
                <TextInput id="ev-source" value={form.source} maxLength={255} onChange={(e) => set({ source: e.target.value })} />
              </Field>
              <Field label="Date as published" htmlFor="ev-published" hint="The B.S. date in the notice, e.g. 2083-07-04">
                <TextInput id="ev-published" value={form.sourcePublishedDate} maxLength={20} onChange={(e) => set({ sourcePublishedDate: e.target.value })} />
              </Field>
            </div>
            <Field label="Document" htmlFor="ev-document" hint="Title or link of the notice">
              <TextInput id="ev-document" value={form.sourceDocument} maxLength={500} onChange={(e) => set({ sourceDocument: e.target.value })} />
            </Field>
            <Field label="Applies to" htmlFor="ev-applies" hint="As the notice says, e.g. Kathmandu valley only">
              <TextInput id="ev-applies" value={form.applicability} maxLength={500} onChange={(e) => set({ applicability: e.target.value })} />
            </Field>
            <Switch id="ev-active" checked={form.isActive} onChange={(v) => set({ isActive: v })} label="The school observes this holiday" description="Switch off to keep the record without closing the school that day" />
          </fieldset>
        )}

        {form.status === "PUBLISHED" && (
          <Checkbox id="ev-notify" label="Send a notification to their phones" description="A short notice in the mobile app, sent once when you save" checked={form.notify} onChange={(e) => set({ notify: e.target.checked })} />
        )}

        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{event ? "Save changes" : "Add to calendar"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventDialog;
