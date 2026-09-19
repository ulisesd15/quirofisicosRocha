// frontend/src/components/calendar/MonthlyCalendar.jsx
import React from 'react';
import { useCalendar } from '../../../hooks/useCalendar';
import "../../../style/calendar.css"

function MonthlyCalendar({ onSelectDate, selectedDate }) {
  const {
    currentMonth, currentYear, prevMonth, nextMonth,
    isDayOpen, selectDate, MONTH_NAMES, DAY_NAMES
  } = useCalendar();

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDate = new Date(firstDay);
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  startDate.setDate(startDate.getDate() - firstDayOfWeek);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  maxDate.setHours(0,0,0,0);

  const handleDayClick = (date) => {
    if (date > maxDate) {
      alert('No se puede agendar con más de 90 días de antelación.');
      return;
    }
    selectDate(date);
    if (onSelectDate) onSelectDate(date);
  };

  const cells = [];
  let current = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const thisDate = new Date(current);
      const isCurrentMonth = thisDate.getMonth() === currentMonth;
      const isCurrentYear = thisDate.getFullYear() === currentYear;
      const isPast = thisDate < new Date(new Date().setHours(0,0,0,0));
      const isTooFar = thisDate > maxDate;
      const isOpen = isDayOpen(thisDate);
      const isTodayDate = thisDate.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && thisDate.toDateString() === selectedDate.toDateString();

      let className = 'calendar-day';
      let disabled = false;
      if (isTodayDate && !isSelected) className += ' today';
      if (isSelected) className += ' selected';
      if (!isCurrentMonth || !isCurrentYear) {
        className += ' other-month';
        disabled = true;
      } else if (isPast) {
        className += ' disabled past-date';
        disabled = true;
      } else if (!isOpen) {
        className += ' unavailable';
        disabled = true;
      } else if (isTooFar) {
        className += ' disabled too-far';
        disabled = true;
      }

      cells.push(
        <button
          key={thisDate.toISOString()}
          type="button"
          className={className}
          disabled={disabled}
          onClick={() => handleDayClick(thisDate)}
          title={isTooFar ? 'No se puede agendar con más de 90 días de antelación.' : undefined}
        >
          {thisDate.getDate()}
        </button>
      );
      current.setDate(current.getDate() + 1);
    }
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header d-flex justify-content-between align-items-center mb-2">
        <button type="button" className="calendar-nav-btn btn btn-sm btn-outline-secondary" onClick={prevMonth} title="Mes anterior">
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="calendar-month-year fw-bold">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>
        <button type="button" className="calendar-nav-btn btn btn-sm btn-outline-secondary" onClick={nextMonth} title="Mes siguiente">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

export default MonthlyCalendar;