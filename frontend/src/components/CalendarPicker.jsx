/**
 * CalendarPicker.jsx — React port of the old Calendar class (calendar.js).
 * Shared by BookAppointmentPage and ReschedulePage: renders a week/month
 * date picker plus a time-slot grid, and reports the chosen date+time via
 * onSelect(dateStr, time).
 *
 * Simplification vs. the original: business hours + schedule exceptions are
 * fetched once on mount (they describe a recurring weekly schedule plus a
 * short list of exceptions) rather than re-fetched on every week/month
 * navigation — the underlying data doesn't change per navigation, so this
 * avoids redundant network calls without changing what the user sees.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clinicService } from '../api/clinicService';
import {
  DAY_NAMES_SHORT,
  MONTH_NAMES,
  formatDate,
  formatTimeToAMPM,
  getDayOfWeekString,
  getMonday,
  hasFutureAvailableSlots,
  isDayOpen,
  isPastDate,
  isSlotBookable,
  isToday,
  isTooFarAhead,
  buildBusinessHoursMap,
  flattenWeekSlots,
} from '../lib/calendarUtils';

export default function CalendarPicker({ selectedDate, selectedTime, onSelect }) {
  const [view, setView] = useState('week');
  const [initializing, setInitializing] = useState(true);
  const [businessHoursMap, setBusinessHoursMap] = useState({});
  const [exceptions, setExceptions] = useState([]);
  const [weekMonday, setWeekMonday] = useState(() => getMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [notice, setNotice] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isOpen = useCallback((date) => isDayOpen(date, businessHoursMap, exceptions), [businessHoursMap, exceptions]);

  const loadSlotsForDate = useCallback(async (date) => {
    setLoadingSlots(true);
    try {
      const data = await clinicService.getAvailableSlots(formatDate(date));
      const list = Array.isArray(data?.availableSlots) ? data.availableSlots : Array.isArray(data?.slots) ? data.slots : [];
      setSlots(list);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Initial load: business hours + exceptions once, then find the first week
  // (starting this week) that actually has future availability.
  useEffect(() => {
    let mounted = true;
    async function init() {
      const [hoursData, exceptionsData] = await Promise.all([
        clinicService.getBusinessHours().catch(() => []),
        clinicService.getScheduleExceptions().catch(() => []),
      ]);
      if (!mounted) return;
      const map = buildBusinessHoursMap(hoursData);
      setBusinessHoursMap(map);
      setExceptions(Array.isArray(exceptionsData) ? exceptionsData : []);

      let monday = getMonday(new Date());
      let advanced = false;
      for (let i = 0; i <= 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const weekData = await clinicService.getSlotsForWeek(formatDate(monday)).catch(() => null);
        const weekSlots = flattenWeekSlots(weekData);
        if (hasFutureAvailableSlots(weekSlots)) {
          if (i > 0) advanced = true;
          break;
        }
        const next = new Date(monday);
        next.setDate(next.getDate() + 7);
        monday = next;
      }
      if (!mounted) return;
      setWeekMonday(monday);
      if (advanced) {
        setNotice('No hay horarios disponibles esta semana — mostrando la próxima semana con disponibilidad.');
      }

      // Auto-select today if it's the visible week and open for booking.
      const today = new Date();
      if (formatDate(getMonday(today)) === formatDate(monday) && isDayOpen(today, map, Array.isArray(exceptionsData) ? exceptionsData : []) && !isPastDate(today)) {
        onSelect(formatDate(today), null);
        loadSlotsForDate(today);
      }
      setInitializing(false);
    }
    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickDate = (date) => {
    if (isPastDate(date) || isTooFarAhead(date) || !isOpen(date)) return;
    onSelect(formatDate(date), null);
    loadSlotsForDate(date);
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => new Date(weekMonday.getTime() + i * 24 * 60 * 60 * 1000));
  }, [weekMonday]);

  const monthGrid = useMemo(() => {
    const firstDay = new Date(monthCursor.year, monthCursor.month, 1);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDayOfWeek);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  }, [monthCursor]);

  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5 className="mb-0">
          <i className="fas fa-calendar me-2" />
          Selecciona la Fecha
        </h5>
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${view === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setView('week')}
            data-testid="button-view-week"
          >
            <i className="fas fa-list me-1" />
            Semana
          </button>
          <button
            type="button"
            className={`btn ${view === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setView('month')}
            data-testid="button-view-month"
          >
            <i className="fas fa-calendar-alt me-1" />
            Mes
          </button>
        </div>
      </div>

      {initializing ? (
        <div className="text-center py-4" data-testid="status-calendar-loading">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Cargando calendario...
        </div>
      ) : (
        <>
          {notice && (
            <div className="alert alert-info small" data-testid="text-calendar-notice">
              {notice}
            </div>
          )}

          {view === 'week' ? (
            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-light week-arrow"
                onClick={() => setWeekMonday((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
                aria-label="Semana anterior"
                data-testid="button-prev-week"
              >
                <i className="fas fa-chevron-left" />
              </button>
              {weekDays.map((day) => {
                const past = isPastDate(day);
                const tooFar = isTooFarAhead(day);
                const open = isOpen(day);
                const disabled = past || tooFar || !open;
                const selected = selectedDate === formatDate(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`btn calendar-day-btn d-flex flex-column align-items-center py-2 ${
                      selected ? 'btn-primary' : disabled ? 'btn-secondary' : 'btn-outline-primary'
                    } ${isToday(day) && !selected ? 'today' : ''}`}
                    disabled={disabled}
                    title={tooFar ? 'No se puede agendar con más de 90 días de antelación.' : !open ? 'Cerrado' : ''}
                    onClick={() => handlePickDate(day)}
                    data-testid={`button-day-${formatDate(day)}`}
                  >
                    <span className="small fw-bold text-capitalize">{day.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                    <span>{`${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="btn btn-light week-arrow"
                onClick={() => setWeekMonday((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
                aria-label="Semana siguiente"
                data-testid="button-next-week"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          ) : (
            <div className="calendar-container">
              <div className="calendar-header d-flex justify-content-between align-items-center mb-2">
                <button
                  type="button"
                  className="calendar-nav-btn btn btn-sm btn-outline-secondary"
                  onClick={() => setMonthCursor((prev) => (prev.month === 0 ? { month: 11, year: prev.year - 1 } : { month: prev.month - 1, year: prev.year }))}
                  aria-label="Mes anterior"
                  data-testid="button-prev-month"
                >
                  <i className="fas fa-chevron-left" />
                </button>
                <div className="calendar-month-year fw-bold" data-testid="text-month-year">
                  {MONTH_NAMES[monthCursor.month]} {monthCursor.year}
                </div>
                <button
                  type="button"
                  className="calendar-nav-btn btn btn-sm btn-outline-secondary"
                  onClick={() => setMonthCursor((prev) => (prev.month === 11 ? { month: 0, year: prev.year + 1 } : { month: prev.month + 1, year: prev.year }))}
                  aria-label="Mes siguiente"
                  data-testid="button-next-month"
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
              <div className="calendar-grid">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="calendar-day-header">
                    {d}
                  </div>
                ))}
                {monthGrid.map((day) => {
                  const inMonth = day.getMonth() === monthCursor.month && day.getFullYear() === monthCursor.year;
                  const past = isPastDate(day);
                  const tooFar = isTooFarAhead(day);
                  const open = isOpen(day);
                  const selected = selectedDate === formatDate(day);
                  const classes = ['calendar-day'];
                  if (!inMonth) classes.push('other-month');
                  else if (past) classes.push('disabled', 'past-date');
                  else if (!open) classes.push('unavailable');
                  else classes.push('available');
                  if (isToday(day) && !selected) classes.push('today');
                  if (selected) classes.push('selected');
                  if (tooFar) classes.push('disabled', 'too-far');
                  const disabled = !inMonth || past || !open || tooFar;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={classes.join(' ')}
                      disabled={disabled}
                      title={tooFar ? 'No se puede agendar con más de 90 días de antelación.' : ''}
                      onClick={() => handlePickDate(day)}
                      data-testid={`button-day-${formatDate(day)}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h5 className="mb-3">
              <i className="fas fa-clock me-2" />
              Horario Disponible
            </h5>
            {!selectedDateObj ? (
              <div className="text-muted small" data-testid="text-select-date-hint">
                Selecciona un día para ver los horarios disponibles.
              </div>
            ) : loadingSlots ? (
              <div className="text-center py-2" data-testid="status-slots-loading">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
              </div>
            ) : slots.length === 0 ? (
              <div className="alert alert-warning text-center" data-testid="text-no-slots">
                Sin horarios disponibles para este día
              </div>
            ) : (
              <div className="row g-2">
                {slots.map((time) => {
                  const bookable = isSlotBookable(selectedDate, time.slice(0, 5));
                  const active = selectedTime === time;
                  return (
                    <div className="col-6 col-sm-4 col-md-3" key={time}>
                      <button
                        type="button"
                        className={`btn w-100 time-slot-btn ${active ? 'btn-primary active' : 'btn-outline-primary'}`}
                        disabled={!bookable}
                        title={!bookable ? 'No disponible (menos de 30 minutos de anticipación o pasado)' : ''}
                        onClick={() => onSelect(selectedDate, time)}
                        data-testid={`button-time-${time}`}
                      >
                        {formatTimeToAMPM(time)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
