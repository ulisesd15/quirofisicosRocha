// frontend/src/components/calendar/TimeSlots.jsx
import React, { useMemo } from 'react';
import { useCalendar } from '../../../hooks/useCalendar';
import "../../../style/calendar.css";

const FULL_DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday'
];

function getDayOfWeekString(date) {
  return FULL_DAY_NAMES[date.getDay()];
}

function TimeSlots({ date, selectedTime, onSelectTime }) {
  const {
    slots,
    loadingSlots,
    businessHoursMap,
    formatTimeToAMPM,
  } = useCalendar();

  // If no date selected, show a helper message
  if (!date) {
    return (
      <div className="alert alert-info text-center">
        Selecciona una fecha para ver los horarios disponibles.
      </div>
    );
  }

  const dayOfWeek = getDayOfWeekString(date).toLowerCase();
  const businessDay = businessHoursMap[dayOfWeek];

  // If business closed or missing hours, show warning
  if (!businessDay || !businessDay.is_open) {
    return (
      <div className="alert alert-warning text-center">
        Sin horarios disponibles para este día.
      </div>
    );
  }

  if (loadingSlots) {
    return (
      <div className="text-center">
        Cargando horarios...
      </div>
    );
  }

  const now = new Date();
  const openHM = businessDay.open_time?.slice(0, 5);
  const closeHM = businessDay.close_time?.slice(0, 5);

  // Filter + annotate slots in a way similar to legacy renderTimeSlots
  const visibleSlots = useMemo(() => {
    if (!Array.isArray(slots) || !slots.length) return [];

    return slots
      .filter((time) => {
        // time: "HH:MM:SS" or "HH:MM"
        const slotHM = time.slice(0, 5);
        if (!openHM || !closeHM) return false;
        // Only keep slots within business hours window
        return slotHM >= openHM && slotHM <= closeHM;
      })
      .map((time) => {
        const slotHM = time.slice(0, 5);
        const slotDateTime = new Date(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${slotHM}:00`
        );
        const minLeadMs = 30 * 60 * 1000;
        const isTooSoonOrPast = slotDateTime < new Date(now.getTime() + minLeadMs);

        return {
          raw: time,
          hm: slotHM,
          label: formatTimeToAMPM(slotHM),
          disabled: isTooSoonOrPast,
        };
      });
  }, [slots, date, openHM, closeHM, formatTimeToAMPM, now.getTime()]);

  if (!visibleSlots.length) {
    return (
      <div className="alert alert-warning text-center">
        Sin horarios disponibles para este día.
      </div>
    );
  }

  return (
    <div className="row g-3">
      {visibleSlots.map((slot) => {
        const isSelected = selectedTime === slot.raw || selectedTime === slot.hm;

        const btnClasses = [
          'btn',
          'time-slot-btn',
          isSelected ? 'btn-primary active' : 'btn-outline-primary',
        ].join(' ');

        return (
          <div
            key={slot.raw}
            className="col-12 col-sm-6 col-md-4 col-lg-3 mb-3"
          >
            <div className="time-slot-card">
              <button
                type="button"
                className={btnClasses}
                disabled={slot.disabled}
                title={
                  slot.disabled
                    ? 'No disponible (menos de 30 minutos de anticipación o pasado)'
                    : undefined
                }
                onClick={() => {
                  if (slot.disabled) return;
                  // Use raw 24h time string; AppointmentPage stores it in selectedTime
                  onSelectTime(slot.hm);
                }}
              >
                {slot.label}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TimeSlots;