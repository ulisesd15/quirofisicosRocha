/**
 * calendarUtils.js — pure helpers ported from the old frontendNew/public/js/calendar.js
 * Calendar class. Kept framework-agnostic so both BookAppointmentPage and
 * ReschedulePage can share the exact same date/business-hours logic.
 */

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DAY_NAMES_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

export const FULL_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Appointments can't be booked more than this many days in the future.
export const MAX_DAYS_AHEAD = 90;

/** Formats a JS Date as yyyy-mm-dd using local date components (avoids UTC off-by-one). */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the day name string (e.g. 'monday') for a JS Date. */
export function getDayOfWeekString(date) {
  return FULL_DAY_NAMES[date.getDay()];
}

/** Returns the Monday of the week containing the given date. */
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isToday(date) {
  return date.toDateString() === new Date().toDateString();
}

export function isPastDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isTooFarAhead(date) {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  maxDate.setHours(0, 0, 0, 0);
  return date > maxDate;
}

/** Converts a 24-hour "HH:MM[:SS]" string to a "H:MM AM/PM" display string. */
export function formatTimeToAMPM(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Finds a schedule exception covering a given date string.
 * ScheduleException model fields (as returned by GET /api/schedule-exceptions):
 * type: 'BLOCK' | 'CUSTOM_HOURS' | 'YEARLY_FIXED' | 'YEARLY_CALCULATED',
 * startDate, endDate (YYYY-MM-DD, used by BLOCK/CUSTOM_HOURS), month, day (used by
 * YEARLY_FIXED, matched against any year), customOpenTime, customCloseTime.
 * YEARLY_CALCULATED (e.g. "day after Thanksgiving") requires server-side calculation
 * logic this client doesn't replicate, so it's intentionally not matched here.
 */
export function getScheduleException(dateStr, exceptions) {
  if (!exceptions || !exceptions.length) return null;
  const [, monthStr, dayStr] = dateStr.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);
  for (const ex of exceptions) {
    if ((ex.type === 'BLOCK' || ex.type === 'CUSTOM_HOURS') && ex.startDate) {
      const start = String(ex.startDate).slice(0, 10);
      const end = ex.endDate ? String(ex.endDate).slice(0, 10) : start;
      if (dateStr >= start && dateStr <= end) return ex;
    }
    if (ex.type === 'YEARLY_FIXED' && ex.month === month && ex.day === day) return ex;
  }
  return null;
}

/** Whether the clinic is open on a given date, honoring exceptions first, then weekly business hours. */
export function isDayOpen(date, businessHoursMap, exceptions) {
  const dateStr = formatDate(date);
  const exception = getScheduleException(dateStr, exceptions);
  if (exception) {
    if (exception.type === 'CUSTOM_HOURS' && exception.customOpenTime && exception.customCloseTime) return true;
    return false; // BLOCK or YEARLY_FIXED (holiday) with no custom hours → closed.
  }
  if (!businessHoursMap || !Object.keys(businessHoursMap).length) return false;
  const businessDay = businessHoursMap[getDayOfWeekString(date)];
  if (!businessDay || !businessDay.isOpen) return false;
  if (!businessDay.openTime || !businessDay.closeTime) return false;
  return true;
}

/** Normalizes the raw /api/business-hours response (Sequelize model JSON, camelCase fields) into a day-of-week keyed map. */
export function buildBusinessHoursMap(rawData) {
  const arr = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.businessHours)
      ? rawData.businessHours
      : [];
  const map = {};
  arr.forEach((bh) => {
    if (bh?.dayOfWeek) map[bh.dayOfWeek.toLowerCase()] = bh;
  });
  return map;
}

/** Normalizes the raw /api/slots?week_start=... response into a flat array of { date, time }. */
export function flattenWeekSlots(rawData) {
  if (rawData?.slots && typeof rawData.slots === 'object' && !Array.isArray(rawData.slots)) {
    const out = [];
    for (const [date, times] of Object.entries(rawData.slots)) {
      (times || []).forEach((time) => out.push({ date, time, filled: false }));
    }
    return out;
  }
  return [];
}

/** True if a given weekly slot list has at least one slot that's still in the future. */
export function hasFutureAvailableSlots(weekSlots) {
  const now = new Date();
  return weekSlots.some((slot) => {
    const slotDate = new Date(`${slot.date}T${slot.time}`);
    return !slot.filled && slotDate > now;
  });
}

/** A slot is bookable only if it's at least 30 minutes from now. */
export function isSlotBookable(dateStr, time) {
  const slotDateTime = new Date(`${dateStr}T${time}:00`);
  return slotDateTime >= new Date(Date.now() + 30 * 60 * 1000);
}
