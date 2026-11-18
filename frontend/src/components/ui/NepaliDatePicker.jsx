import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { adToBs, bsToAd, addDays, isIsoDate, isSupportedAd, todayAd, MIN_AD, MAX_AD } from "../../lib/calendar/bsDateAdapter";
import { formatAd, formatBs, digits, weekdayName, bsMonthName, adMonthName } from "../../lib/calendar/dateFormatter";
import { parseAdInput, parseBsInput, bsInputProblem } from "../../lib/calendar/dateValidation";
import { monthGrid, viewOf, shiftView, yearOptions, weekdayOrder, addMonths, viewRange } from "../../lib/calendar/calendarUtils";

/**
 * Date field with a Bikram Sambat calendar.
 *
 * The value is always an AD date, "YYYY-MM-DD" (or "" for none): that is what
 * the API stores, so a form sends exactly what a native date input sent. The
 * person picks, reads and types the date in BS (or AD: the calendar, the
 * language and the numerals can each be switched inside the picker).
 *
 *   <NepaliDatePicker value={date} onChange={(ad, info) => setDate(ad)} max={todayAd()} />
 *
 * onChange(ad, { bs, bsText, adText }): `ad` is "" when cleared; `bs` is
 * { year, month, day } or null.
 *
 * Props: min / max (AD), isDateDisabled(ad) for days that cannot be chosen,
 * invalid, disabled, clearable (default true), id, name (adds a hidden input
 * for plain forms), placeholder, onBlur.
 *
 * Keyboard, on the day grid: arrows move by day and week, Home / End go to the
 * start and end of the week, PageUp / PageDown change month (with Shift: year),
 * Enter or Space chooses, Esc closes.
 */
const NepaliDatePicker = React.forwardRef(function NepaliDatePicker(
  {
    value = "",
    onChange,
    onBlur,
    min,
    max,
    isDateDisabled,
    invalid = false,
    disabled = false,
    clearable = true,
    id,
    name,
    placeholder = "Select a date",
    className,
    align = "start",
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
  },
  ref,
) {
  const prefs = useDatePrefs();
  const autoId = useId();
  const fieldId = id || autoId;
  const gridRef = useRef(null);

  const selected = isIsoDate(value) ? value : "";
  const lower = min && min > MIN_AD ? min : MIN_AD;
  const upper = max && max < MAX_AD ? max : MAX_AD;

  const [open, setOpen] = useState(false);
  // What the picker shows. It starts from the person's preference each time it opens.
  const [mode, setMode] = useState(prefs.calendar === "ad" ? "ad" : "bs");
  const [language, setLanguage] = useState(prefs.language);
  const [numerals, setNumerals] = useState(prefs.numerals);
  const [focusDay, setFocusDay] = useState(selected || todayAd());
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState("");
  const moveFocusRef = useRef(false);

  const today = todayAd();
  const view = useMemo(() => viewOf(focusDay, mode) || viewOf(today, mode), [focusDay, mode, today]);
  const weeks = useMemo(() => monthGrid(view, prefs.weekStartsOn), [view, prefs.weekStartsOn]);
  const years = useMemo(() => yearOptions(mode), [mode]);

  const isDisabledDay = (ad) => !isSupportedAd(ad) || ad < lower || ad > upper || Boolean(isDateDisabled?.(ad));

  const handleOpenChange = (next) => {
    if (next) {
      const start = selected || (today < lower ? lower : today > upper ? upper : today);
      setMode(prefs.calendar === "ad" ? "ad" : "bs");
      setLanguage(prefs.language);
      setNumerals(prefs.numerals);
      setFocusDay(start);
      setTyped("");
      setTypedError("");
    } else {
      onBlur?.();
    }
    setOpen(next);
  };

  // After the keyboard moves the day, put the focus on its button.
  useEffect(() => {
    if (!open || !moveFocusRef.current) return;
    moveFocusRef.current = false;
    gridRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, open, mode]);

  const emit = (ad) => {
    const bs = ad ? adToBs(ad) : null;
    onChange?.(ad, {
      bs,
      bsText: bs ? formatBs(bs, { language: prefs.language, numerals: prefs.numerals }) : "",
      adText: ad ? formatAd(ad) : "",
    });
  };

  const choose = (ad) => {
    if (isDisabledDay(ad)) return;
    emit(ad);
    setOpen(false);
    onBlur?.();
  };

  const moveTo = (ad) => {
    if (!ad || !isSupportedAd(ad)) return;
    moveFocusRef.current = true;
    setFocusDay(ad);
  };

  const onGridKeyDown = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let next = null;
    if (step) next = addDays(focusDay, step);
    else if (e.key === "Home") next = addDays(focusDay, -((new Date(`${focusDay}T00:00:00Z`).getUTCDay() - prefs.weekStartsOn + 7) % 7));
    else if (e.key === "End") next = addDays(focusDay, 6 - ((new Date(`${focusDay}T00:00:00Z`).getUTCDay() - prefs.weekStartsOn + 7) % 7));
    else if (e.key === "PageUp") next = addMonths(focusDay, e.shiftKey ? -12 : -1, mode);
    else if (e.key === "PageDown") next = addMonths(focusDay, e.shiftKey ? 12 : 1, mode);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(focusDay);
      return;
    } else return;
    e.preventDefault();
    moveTo(next);
  };

  const goToView = (next) => {
    if (!next) return;
    const range = viewRange(next);
    if (range) setFocusDay(focusDay >= range.from && focusDay <= range.to ? focusDay : range.from);
  };

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setTyped("");
    setTypedError("");
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    const ad = mode === "bs" ? bsToAd(parseBsInput(typed)) : parseAdInput(typed);
    if (!ad) {
      setTypedError(mode === "bs" ? bsInputProblem(typed) : "Write the date as year-month-day, for example 2026-04-14");
      return;
    }
    if (isDisabledDay(ad)) {
      setTypedError("That date cannot be chosen here");
      setFocusDay(isSupportedAd(ad) ? ad : focusDay);
      return;
    }
    choose(ad);
  };

  // What the closed field shows: the preferred calendar first, the other one after it.
  const showBsFirst = prefs.calendar !== "ad";
  const selectedBs = selected ? adToBs(selected) : null;
  const bsText = selectedBs ? formatBs(selectedBs, { language: prefs.language, numerals: prefs.numerals }) : "";
  const adText = selected ? formatAd(selected, { language: prefs.language, numerals: prefs.numerals }) : "";
  const primary = showBsFirst ? bsText || adText : adText;
  const secondary = showBsFirst ? (bsText ? adText : "") : bsText;

  const monthNames = Array.from({ length: 12 }, (_, i) => (mode === "bs" ? bsMonthName(i + 1, language) : adMonthName(i + 1, language)));
  const prevView = shiftView(view, -1);
  const nextView = shiftView(view, 1);
  const todayDisabled = isDisabledDay(today);
  const pill = (active) =>
    cn(
      "cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600",
      active ? "bg-white text-brand-700 shadow-xs" : "text-slate-500 hover:text-slate-800",
    );

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn("relative", className)}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type="button"
            id={fieldId}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={ariaDescribedBy}
            aria-label={ariaLabel ? `${ariaLabel}: ${primary || "no date"}` : undefined}
            data-testid="date-picker"
            data-value={selected}
            className={cn(
              "flex min-h-[38px] w-full cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-xs transition-colors",
              "focus:outline-none focus-visible:ring-3",
              invalid
                ? "border-risk focus-visible:border-risk focus-visible:ring-risk/15"
                : "border-slate-300 hover:border-slate-400 focus-visible:border-brand-500 focus-visible:ring-brand-500/15",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              clearable && selected && !disabled && "pr-9",
            )}
          >
            <CalendarDays size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            {selected ? (
              <span className="min-w-0 flex-1 truncate">
                <span className="text-slate-900">{primary}</span>
                {secondary && <span className="ml-1.5 text-xs text-slate-500">({secondary})</span>}
              </span>
            ) : (
              <span className="flex-1 truncate text-slate-400">{placeholder}</span>
            )}
          </button>
        </Popover.Trigger>
        {clearable && selected && !disabled && (
          <button
            type="button"
            onClick={() => emit("")}
            aria-label="Clear date"
            className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {name && <input type="hidden" name={name} value={selected} />}
      </div>

      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            gridRef.current?.querySelector('[tabindex="0"]')?.focus();
          }}
          className="z-[60] w-[19.5rem] max-w-[calc(100vw-1rem)] animate-pop-in rounded-xl border border-slate-200 bg-white p-3 shadow-pop outline-none"
          aria-label="Choose a date"
        >
          {/* Calendar, language and numerals */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Calendar">
              <button type="button" className={pill(mode === "bs")} aria-pressed={mode === "bs"} onClick={() => changeMode("bs")}>B.S.</button>
              <button type="button" className={pill(mode === "ad")} aria-pressed={mode === "ad"} onClick={() => changeMode("ad")}>A.D.</button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Language">
                <button type="button" className={pill(language === "en")} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
                <button type="button" className={pill(language === "ne")} aria-pressed={language === "ne"} onClick={() => setLanguage("ne")}>ने</button>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Numerals">
                <button type="button" className={pill(numerals === "en")} aria-pressed={numerals === "en"} onClick={() => setNumerals("en")}>123</button>
                <button type="button" className={pill(numerals === "ne")} aria-pressed={numerals === "ne"} onClick={() => setNumerals("ne")}>१२३</button>
              </div>
            </div>
          </div>

          {/* Month and year */}
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToView(prevView)}
              disabled={!prevView}
              aria-label="Previous month"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <select
              aria-label="Month"
              value={view.month}
              onChange={(e) => goToView({ ...view, month: Number(e.target.value) })}
              className="h-8 min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-1.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              {monthNames.map((label, i) => (
                <option key={label} value={i + 1}>{label}</option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={view.year}
              onChange={(e) => goToView({ ...view, year: Number(e.target.value) })}
              className="h-8 w-[5.25rem] cursor-pointer rounded-lg border border-slate-200 bg-white px-1.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{digits(y, numerals)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => goToView(nextView)}
              disabled={!nextView}
              aria-label="Next month"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Days */}
          <div ref={gridRef} role="grid" aria-label={`${monthNames[view.month - 1]} ${view.year}`} onKeyDown={onGridKeyDown}>
            <div role="row" className="grid grid-cols-7">
              {weekdayOrder(prefs.weekStartsOn).map((w) => (
                <div
                  key={w}
                  role="columnheader"
                  aria-label={weekdayName(w, language)}
                  className={cn("py-1 text-center text-[11px] font-medium", prefs.weeklyHolidayDays.includes(w) ? "text-risk" : "text-slate-400")}
                >
                  {weekdayName(w, language, true).slice(0, language === "ne" ? 4 : 2)}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div role="row" key={wi} className="grid grid-cols-7">
                {week.map((cell, ci) => {
                  if (!cell) return <div key={ci} role="gridcell" />;
                  const off = isDisabledDay(cell.ad);
                  const isSelected = cell.ad === selected;
                  const isToday = cell.ad === today;
                  const isFocus = cell.ad === focusDay;
                  const weekly = prefs.weeklyHolidayDays.includes(cell.weekday);
                  return (
                    <div role="gridcell" key={cell.ad} aria-selected={isSelected} className="p-0.5">
                      <button
                        type="button"
                        data-day={cell.ad}
                        tabIndex={isFocus ? 0 : -1}
                        aria-disabled={off || undefined}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${formatBs(cell.bs)} (${formatAd(cell.ad)})${off ? ", not available" : ""}`}
                        onClick={() => (off ? setFocusDay(cell.ad) : choose(cell.ad))}
                        onFocus={() => cell.ad !== focusDay && cell.inMonth && setFocusDay(cell.ad)}
                        className={cn(
                          "relative flex h-9 w-full cursor-pointer flex-col items-center justify-center rounded-lg text-sm leading-none transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600",
                          isSelected
                            ? "bg-brand-600 font-semibold text-brand-fg"
                            : cn(
                                "hover:bg-brand-50",
                                !cell.inMonth ? "text-slate-300" : weekly ? "text-risk" : "text-slate-800",
                                isToday && "font-semibold ring-1 ring-inset ring-brand-400",
                              ),
                          off && "cursor-not-allowed text-slate-300 line-through decoration-slate-300 hover:bg-transparent",
                        )}
                      >
                        <span>{cell.label === null ? "" : digits(cell.label, numerals)}</span>
                        <span className={cn("mt-0.5 text-[9px]", isSelected ? "text-brand-fg/80" : "text-slate-400")} aria-hidden="true">
                          {cell.altLabel === null ? "" : digits(cell.altLabel, mode === "bs" ? "en" : numerals)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Type a date */}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setTypedError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitTyped();
                  }
                }}
                placeholder={mode === "bs" ? "Type B.S. date: 2083-01-15" : "Type A.D. date: 2026-04-14"}
                aria-label={mode === "bs" ? "Type a B.S. date, year-month-day" : "Type an A.D. date, year-month-day"}
                aria-invalid={typedError ? true : undefined}
                className={cn(
                  "h-8 min-w-0 flex-1 rounded-lg border bg-white px-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none",
                  typedError ? "border-risk" : "border-slate-200 focus:border-brand-500",
                )}
              />
              <button
                type="button"
                onClick={submitTyped}
                disabled={!typed.trim()}
                className="h-8 shrink-0 cursor-pointer rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                Set
              </button>
            </div>
            {typedError && <p className="mt-1 text-xs font-medium text-risk" role="alert">{typedError}</p>}
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => choose(today)}
                disabled={todayDisabled}
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                Today
              </button>
              {clearable && (
                <button
                  type="button"
                  onClick={() => {
                    emit("");
                    setOpen(false);
                    onBlur?.();
                  }}
                  disabled={!selected}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

export default NepaliDatePicker;
