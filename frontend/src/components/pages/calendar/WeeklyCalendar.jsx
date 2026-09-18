// frontend/src/components/calendar/WeeklyCalendar.jsx
import React, { useEffect, useState } from 'react';
import { useCalendar } from '../../../hooks/useCalendar';
import "../../../style/calendar.css";

// Helper: get Monday of the week for a given date
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();           // 0 = Sunday, 1 = Monday, ...
  const diff = (day + 6) % 7;       // number of days to go back to Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function WeeklyCalendar({ onSelectDate, selectedDate }) {
  const {
    selectDate,
    isDayOpen,
    fetchBusinessHours,
    fetchScheduleExceptions,
  } = useCalendar();

  const today = new Date();
  const initialWeekMonday = getMonday(selectedDate || today);

  const [weekMonday, setWeekMonday] = useState(initialWeekMonday);

  // Load business hours / exceptions for the current week start
  useEffect(() => {
    fetchBusinessHours(weekMonday);
    fetchScheduleExceptions();
  }, [weekMonday, fetchBusinessHours, fetchScheduleExceptions]);

  // 90-day booking window
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  maxDate.setHours(0, 0, 0, 0);

  const isPastDate = (date) => {
    const d = new Date(date);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < todayMidnight;
  };

  const handleDayClick = (day) => {
    if (day > maxDate) {
      alert('No se puede agendar con más de 90 días de antelación.');
      return;
    }
    selectDate(day);
    if (onSelectDate) onSelectDate(day);
  };

  const goPrevWeek = () => {
    const prev = new Date(weekMonday);
    prev.setDate(prev.getDate() - 7);
    setWeekMonday(prev);
  };

  const goNextWeek = () => {
    const next = new Date(weekMonday);
    next.setDate(next.getDate() + 7);
    setWeekMonday(next);
  };

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekMonday);
    day.setDate(weekMonday.getDate() + i);

    const isTodayDate = day.toDateString() === today.toDateString();
    const isSelected =
      selectedDate && day.toDateString() === selectedDate.toDateString();
    const isOpenDay = isDayOpen(day);
    const isPast = isPastDate(day);
    const isTooFar = day > maxDate;

    let className =
      'btn calendar-day-btn d-flex flex-column align-items-center py-2';
    let disabled = false;

    if (isTodayDate && !isSelected) className += ' today';
    if (isSelected) className += ' selected btn-primary';

    if (!isOpenDay || isPast || isTooFar) {
      className += ' btn-secondary';
      disabled = true;
    } else {
      className += ' btn-outline-primary';
    }

    days.push(
      <button
        key={day.toISOString()}
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => !disabled && handleDayClick(day)}
        title={
          isTooFar
            ? 'No se puede agendar con más de 90 días de antelación.'
            : !isOpenDay
            ? 'Cerrado'
            : isPast
            ? 'No disponible'
            : undefined
        }
      >
        <span className="small fw-bold">
          {day.toLocaleDateString('es-MX', { weekday: 'short' })}
        </span>
        <span>
          {String(day.getMonth() + 1).padStart(2, '0')}/
          {String(day.getDate()).padStart(2, '0')}
        </span>
      </button>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center gap-2">
      <button
        type="button"
        className="btn btn-light week-arrow"
        onClick={goPrevWeek}
        title="Semana anterior"
      >
        <i className="fas fa-chevron-left"></i>
      </button>

      {days}

      <button
        type="button"
        className="btn btn-light week-arrow"
        onClick={goNextWeek}
        title="Semana siguiente"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

export default WeeklyCalendar;