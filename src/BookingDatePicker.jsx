import { useMemo, useState } from "react";
import {
  BOOKING_MONTH_LABELS,
  BOOKING_WEEKDAY_LABELS,
  getDaysInMonth,
  getMinBookingDateString,
  getMondayBasedWeekday,
  isSelectableBookingDate,
  monthIndex,
  parseIsoDate,
  toIsoDate
} from "./bookingDate";

function buildCalendarCells(viewYear, viewMonth) {
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const leadingBlanks = getMondayBasedWeekday(viewYear, viewMonth);
  const cells = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ key: `blank-${i}`, blank: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `${viewYear}-${viewMonth}-${day}`,
      blank: false,
      iso: toIsoDate(viewYear, viewMonth, day)
    });
  }
  return cells;
}

function getInitialView(value, minDate) {
  const parsed = parseIsoDate(value) ?? parseIsoDate(minDate);
  if (parsed) {
    return { year: parsed.year, month: parsed.month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function BookingDatePicker({
  id,
  label,
  value,
  onChange,
  minDate = getMinBookingDateString()
}) {
  const minParsed = parseIsoDate(minDate);
  const [view, setView] = useState(() => getInitialView(value, minDate));
  const cells = useMemo(
    () => buildCalendarCells(view.year, view.month),
    [view.year, view.month]
  );

  const canGoToPreviousMonth =
    minParsed && monthIndex(view.year, view.month) > monthIndex(minParsed.year, minParsed.month);

  function goToPreviousMonth() {
    if (!canGoToPreviousMonth) return;
    setView((current) => {
      if (current.month === 1) return { year: current.year - 1, month: 12 };
      return { year: current.year, month: current.month - 1 };
    });
  }

  function goToNextMonth() {
    setView((current) => {
      if (current.month === 12) return { year: current.year + 1, month: 1 };
      return { year: current.year, month: current.month + 1 };
    });
  }

  function handleDaySelect(iso) {
    if (!isSelectableBookingDate(iso, minDate)) return;
    onChange(iso);
  }

  return (
    <div className="booking-date-picker">
      <span className="booking-date-picker-label" id={`${id}-label`}>
        {label}
      </span>
      <div
        id={id}
        className="booking-date-picker-panel"
        role="application"
        aria-labelledby={`${id}-label`}
      >
        <div className="booking-date-picker-nav">
          <button
            type="button"
            className="booking-date-picker-nav-btn"
            onClick={goToPreviousMonth}
            disabled={!canGoToPreviousMonth}
            aria-label="Föregående månad"
          >
            ‹
          </button>
          <span className="booking-date-picker-month">
            {BOOKING_MONTH_LABELS[view.month - 1]} {view.year}
          </span>
          <button
            type="button"
            className="booking-date-picker-nav-btn"
            onClick={goToNextMonth}
            aria-label="Nästa månad"
          >
            ›
          </button>
        </div>
        <div className="booking-date-picker-weekdays" aria-hidden="true">
          {BOOKING_WEEKDAY_LABELS.map((name) => (
            <span key={name} className="booking-date-picker-weekday">
              {name}
            </span>
          ))}
        </div>
        <div className="booking-date-picker-grid" role="grid">
          {cells.map((cell) => {
            if (cell.blank) {
              return <span key={cell.key} className="booking-date-picker-day is-empty" />;
            }
            const selectable = isSelectableBookingDate(cell.iso, minDate);
            const isSelected = value === cell.iso;
            const isToday = cell.iso === minDate;
            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                className={[
                  "booking-date-picker-day",
                  selectable ? "is-selectable" : "is-disabled",
                  isSelected ? "is-selected" : "",
                  isToday ? "is-today" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!selectable}
                aria-disabled={!selectable}
                aria-pressed={isSelected}
                aria-label={cell.iso}
                onClick={() => handleDaySelect(cell.iso)}
              >
                {parseIsoDate(cell.iso)?.day}
              </button>
            );
          })}
        </div>
      </div>
      {value ? (
        <p className="booking-date-picker-selected">
          Vald tid:{" "}
          {new Date(`${value}T12:00:00`).toLocaleDateString("sv-SE", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })}
        </p>
      ) : null}
    </div>
  );
}
