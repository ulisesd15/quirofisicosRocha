// frontend/src/hooks/useCalendar.js
import { useState, useEffect, useCallback, useMemo } from 'react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const FULL_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfWeekString(date) {
  return FULL_DAY_NAMES[date.getDay()];
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function isToday(date) {
  return date.toDateString() === new Date().toDateString();
}

function isPastDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return d < today;
}

function formatTimeToAMPM(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function useCalendar(initialDate = new Date()) {
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [businessHours, setBusinessHours] = useState([]);
  const [businessHoursMap, setBusinessHoursMap] = useState({});
  const [scheduleExceptions, setScheduleExceptions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch business hours
  const fetchBusinessHours = useCallback(async (date) => {
    try {
      const dateParam = date ? `/${formatDate(date)}` : '';
      const res = await fetch(`/api/business-hours${dateParam}`);
      if (!res.ok) throw new Error('Failed to fetch business hours');
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : (Array.isArray(data.businessHours) ? data.businessHours
          : (Array.isArray(data.businessHours) ? data.businessHours : []));
      const normalized = arr.map(bh => ({ ...bh, dayOfWeek: bh.dayOfWeek.toLowerCase() }));
      setBusinessHours(normalized);
      const map = {};
      normalized.forEach(bh => { map[bh.dayOfWeek.toLowerCase()] = bh; });
      setBusinessHoursMap(map);
      return normalized;
    } catch (e) {
      setBusinessHours([]);
      setBusinessHoursMap({});
      return [];
    }
  }, []);

  // Fetch schedule exceptions
  const fetchScheduleExceptions = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule-exceptions');
      if (!res.ok) throw new Error('Failed to fetch schedule exceptions');
      const data = await res.json();
      setScheduleExceptions(data);
      return data;
    } catch (e) {
      setScheduleExceptions([]);
      return [];
    }
  }, []);

  // Get exception for a date string
  const getScheduleException = useCallback((dateStr) => {
    if (!scheduleExceptions.length) return null;
    for (const ex of scheduleExceptions) {
      if (ex.exceptionType === 'singleDay' && ex.startDate === dateStr) return ex;
      if (ex.exceptionType === 'dateRange' && dateStr >= ex.startDate && dateStr <= ex.endDate) return ex;
    }
    return null;
  }, [scheduleExceptions]);

  // Check if day is open
  const isDayOpen = useCallback((date) => {
    const dateStr = formatDate(date);
    const exception = getScheduleException(dateStr);
    if (exception) {
      if (exception.isClosed) return false;
      if (exception.customOpenTime && exception.customCloseTime) return true;
    }
    if (!businessHours.length) return false;
    const dayOfWeek = getDayOfWeekString(date).toLowerCase();
    const businessDay = businessHoursMap[dayOfWeek];
    if (!businessDay) return false;
    if (!businessDay.isOpen) return false;
    if (!businessDay.openTime || !businessDay.closeTime) return false;
    return true;
  }, [businessHours, businessHoursMap, getScheduleException]);

  // Fetch available slots for a date
  const fetchAvailableSlots = useCallback(async (date) => {
    try {
      const dateStr = formatDate(date);
      const res = await fetch(`/api/available-slots/${dateStr}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.availableSlots && Array.isArray(data.availableSlots)) return data.availableSlots;
      if (data.slots && Array.isArray(data.slots)) return data.slots;
      return [];
    } catch (e) {
      return [];
    }
  }, []);

  // Render time slots for selected date
  const loadSlotsForDate = useCallback(async (date) => {
    setLoadingSlots(true);
    const dayOfWeek = getDayOfWeekString(date).toLowerCase();
    const businessDay = businessHoursMap[dayOfWeek];
    if (!businessDay || !businessDay.is_open) {
      setSlots([]);
      setLoadingSlots(false);
      return [];
    }
    const available = await fetchAvailableSlots(date);
    setSlots(available);
    setLoadingSlots(false);
    return available;
  }, [businessHoursMap, fetchAvailableSlots]);

  // Select date
  const selectDate = useCallback((date) => {
    setSelectedDate(date);
    loadSlotsForDate(date);
  }, [loadSlotsForDate]);

  // Select time slot (returns {date, time24})
  const selectTimeSlot = useCallback((time24, dateOverride) => {
    const date = dateOverride || selectedDate;
    return { date, time24 };
  }, [selectedDate]);

  // Navigation monthly
  const prevMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 0) { setCurrentYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);
  const nextMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 11) { setCurrentYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  // Initialize business hours + exceptions on mount / when month changes
  useEffect(() => {
    const midMonth = new Date(currentYear, currentMonth, 15);
    fetchBusinessHours(midMonth);
    fetchScheduleExceptions();
  }, [currentMonth, currentYear, fetchBusinessHours, fetchScheduleExceptions]);

  return {
    currentMonth,
    currentYear,
    selectedDate,
    businessHours,
    businessHoursMap,
    scheduleExceptions,
    slots,
    loadingSlots,
    selectDate,
    selectTimeSlot,
    prevMonth,
    nextMonth,
    fetchBusinessHours,
    fetchScheduleExceptions,
    isDayOpen,
    formatTimeToAMPM,
    MONTH_NAMES,
    DAY_NAMES,
  };
}