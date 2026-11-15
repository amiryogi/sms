import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, LoadingBlock, confirmDialog, toast } from "../ui";
import { calendarService } from "../../api/calendarService";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { fullName, formatDateTime } from "../../utils/format";
import { RECURRENCE_OPTIONS, ROLE_LABELS } from "../../lib/calendar/calendarConstants";
import { weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { CategoryChip } from "./CalendarParts";
import { itemDateText, itemSecondaryDateText, itemTimeText } from "./calendarItems";

const Row = ({ label, children }) => (
  <div className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[8.5rem_1fr]">
    <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
    <dd className="text-sm text-slate-800">{children}</dd>
  </div>
);

/**
 * Everything about one stored event or holiday, with both calendars' dates.
 * `eventId` is the event to show; `occurrence` ({ startDate, endDate }) is the
 * day that was clicked when the event repeats. Admins (and a teacher, for an
 * event they added) get Edit and Delete.
 */
const EventDetailDialog = ({ eventId, occurrence, onClose, onEdit, onDeleted }) => {
  const { user, hasRole } = useAuth();
  const prefs = useDatePrefs();
  // What was loaded, and for which event: an answer for an earlier one is ignored.
  const [loaded, setLoaded] = useState({ id: null, event: null, error: "" });

  useEffect(() => {
    if (!eventId) return undefined;
    let alive = true;
    calendarService
      .getEvent(eventId)
      .then((res) => alive && setLoaded({ id: eventId, event: res.data, error: "" }))
      .catch((e) => alive && setLoaded({ id: eventId, event: null, error: e.response?.data?.message || "Could not load this event" }));
    return () => {
      alive = false;
    };
  }, [eventId]);
  const event = loaded.id === eventId ? loaded.event : null;
  const error = loaded.id === eventId ? loaded.error : "";

  const canEdit = event && (hasRole("ADMIN") || event.createdBy?.id === user?.id);
  const shown = event ? { ...event, ...(occurrence || {}) } : null;
  const repeat = event && RECURRENCE_OPTIONS.find((r) => r.value === event.recurrence);

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete "${event.title}"?`,
      message: event.recurrence !== "NONE" ? "This removes every repeat of it from the calendar. It cannot be undone." : "It will be removed from everyone's calendar. This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await calendarService.deleteEvent(event.id);
      toast.success("Deleted");
      onDeleted?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not delete");
    }
  };

  return (
    <Dialog
      open={Boolean(eventId)}
      onClose={onClose}
      title={event?.title || "Calendar event"}
      footer={
        canEdit ? (
          <>
            <Button variant="danger-soft" icon={Trash2} onClick={remove}>Delete</Button>
            <Button icon={Pencil} onClick={() => onEdit?.(event)}>Edit</Button>
          </>
        ) : undefined
      }
    >
      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : !event ? (
        <LoadingBlock text="Loading…" />
      ) : (
        <dl className="divide-y divide-slate-100">
          <Row label="Type">
            <span className="flex flex-wrap items-center gap-2">
              <CategoryChip category={event.category} />
              {event.status === "DRAFT" && <Badge tone="warning">Draft</Badge>}
              {!event.isActive && <Badge tone="neutral">Not observed</Badge>}
            </span>
          </Row>
          <Row label="When">
            <span className="font-medium">
              {weekdayNameOf(shown.startDate, prefs.language)}, {itemDateText(shown, prefs)}
            </span>
            <span className="block text-xs text-slate-500">{itemSecondaryDateText(shown, prefs)}</span>
            <span className="block text-xs text-slate-500">{itemTimeText(event, prefs.numerals)}</span>
          </Row>
          {repeat && event.recurrence !== "NONE" && <Row label="Repeats">{repeat.label}</Row>}
          <Row label="For">
            {event.audienceType === "ALL"
              ? "Everyone in the school"
              : event.audienceType === "ROLE"
                ? event.roles.map((r) => ROLE_LABELS[r] || r).join(", ")
                : event.classTargets.map((t) => [t.className, t.sectionName].filter(Boolean).join(" ")).join(", ")}
          </Row>
          {event.description && <Row label="Details"><span className="whitespace-pre-line">{event.description}</span></Row>}
          {event.applicability && <Row label="Applies to">{event.applicability}</Row>}
          {(event.source || event.sourceDocument) && (
            <Row label="Source">
              {event.source}
              {event.sourceDocument && <span className="block text-xs text-slate-500">{event.sourceDocument}</span>}
              {event.sourcePublishedDate && <span className="block text-xs text-slate-500">Published date: {event.sourcePublishedDate} B.S.</span>}
            </Row>
          )}
          {event.createdBy && (
            <Row label="Added by">
              {fullName(event.createdBy)}
              <span className="block text-xs text-slate-500">Last changed {formatDateTime(event.updatedAt)}</span>
            </Row>
          )}
        </dl>
      )}
    </Dialog>
  );
};

export default EventDetailDialog;
