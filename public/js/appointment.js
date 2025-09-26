// --- Globals ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let businessHours = [];
let scheduleExceptions = [];

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const fullDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// --- Utility Functions ---
const formatDate = date => date.toISOString().split('T')[0];
const formatTimeToAMPM = time24 => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};
const isToday = date => date.toDateString() === new Date().toDateString();
const isPastDate = date => {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return d < today;
};
const getDayOfWeekString = date => fullDayNames[date.getDay()];


// --- WEEKLY VIEW AUTO-ADVANCE FEATURE ---
  /**
   * Checks if the current week has any available (future and unfilled) slots.
   * If not, advances to the next week with available slots.
   * Should be called after rendering the weekly view.
   * @param {Array} weekSlots - Array of slot objects for the current week
   * @param {Function} renderWeekFn - Function to render a given week (accepts a Date object for Monday)
   * @param {Date} currentMonday - The Monday date of the current week
   */
async function autoAdvanceIfNoAvailableSlots(weekSlots, renderWeekFn, currentMonday) {
  const now = new Date();
  // Filter for available slots: not filled and in the future
  const available = weekSlots.filter(slot => {
    const slotDate = new Date(slot.date + 'T' + slot.time);
    return !slot.filled && slotDate > now;
  });
  if (available.length > 0) return; // There are available slots this week

  // Try next week (up to 12 weeks ahead for safety)
  let weeksAhead = 1;
  let found = false;
  let nextMonday = new Date(currentMonday);
  while (weeksAhead <= 12 && !found) {
    nextMonday.setDate(currentMonday.getDate() + 7 * weeksAhead);
    // Fetch slots for nextMonday's week
    let nextWeekSlots = await fetchSlotsForWeek(nextMonday);
    const nextAvailable = nextWeekSlots.filter(slot => {
      const slotDate = new Date(slot.date + 'T' + slot.time);
      return !slot.filled && slotDate > now;
    });
    if (nextAvailable.length > 0) {
      found = true;
      renderWeekFn(nextMonday); // Render the next available week
      if (typeof showSuccess === 'function') {
        showSuccess('No hay horarios disponibles esta semana. Mostrando la siguiente semana con disponibilidad.');
      } else {
        alert('No hay horarios disponibles esta semana. Mostrando la siguiente semana con disponibilidad.');
      }
      break;
    }
    weeksAhead++;
  }
  if (!found) {
    if (typeof showError === 'function') {
      showError('No se encontraron horarios disponibles en las próximas semanas.');
    } else {
      alert('No se encontraron horarios disponibles en las próximas semanas.');
    }
  }
}

  /**
   * Example stub for fetching slots for a week. Replace with your real API call.
   * @param {Date} mondayDate
   * @returns {Promise<Array>} Array of slot objects for the week
   */
  async function fetchSlotsForWeek(mondayDate) {
  // Format mondayDate as yyyy-mm-dd
  const yyyy = mondayDate.getFullYear();
  const mm = String(mondayDate.getMonth() + 1).padStart(2, '0');
  const dd = String(mondayDate.getDate()).padStart(2, '0');
  const weekStart = `${yyyy}-${mm}-${dd}`;
  try {
    const resp = await fetch(`/api/slots?week_start=${weekStart}`);
    if (!resp.ok) throw new Error('Error fetching slots');
    const data = await resp.json();
    return data.slots || [];
  } catch (e) {
    console.error('Error fetching slots for week:', e);
    return [];
  }
  }

  // --- Data Fetch ---
  async function fetchBusinessHours(date) {
    try {
      const dateParam = date ? `/${formatDate(date)}` : '';
      const response = await fetch(`/api/admin/business-hours${dateParam}`);
    if (!response.ok) throw new Error('Failed to fetch business hours');
    const data = await response.json();
    let arr = Array.isArray(data)
      ? data
      : (Array.isArray(data.business_hours) ? data.business_hours
        : (Array.isArray(data.businessHours) ? data.businessHours : []));
    businessHours = arr.map(bh => ({ ...bh, day_of_week: bh.day_of_week.toLowerCase() }));
    return businessHours;
  } catch (e) {
    businessHours = [];
    return businessHours;
  }
}
async function fetchScheduleExceptions() {
  try {
    const response = await fetch('/api/schedule-exceptions');
    if (!response.ok) throw new Error('Failed to fetch schedule exceptions');
    scheduleExceptions = await response.json();
    return scheduleExceptions;
  } catch (e) {
    scheduleExceptions = [];
    return scheduleExceptions;
  }
}

// --- Business Logic ---
function getScheduleException(dateStr) {
  if (!scheduleExceptions.length) return null;
  const date = new Date(dateStr);
  for (const ex of scheduleExceptions) {
    if (ex.exception_type === 'single_day' && ex.start_date === dateStr) return ex;
    if (ex.exception_type === 'date_range' && dateStr >= ex.start_date && dateStr <= ex.end_date) return ex;
  }
  return null;
}
function isDayOpen(date) {
  const dateStr = formatDate(date);
  const exception = getScheduleException(dateStr);
  if (exception) {
    if (exception.is_closed) return false;
    if (exception.custom_open_time && exception.custom_close_time) return true;
  }
  if (!businessHours.length) return false;
  // Defensive: businessHours may have day_of_week as string or number, always compare as lowercase string
  const dayOfWeek = getDayOfWeekString(date).toLowerCase();
  const businessDay = businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek);
  if (!businessDay) return false;
  if (!businessDay.is_open) return false;
  if (!businessDay.open_time || !businessDay.close_time) return false;
  return true;
}

// --- Calendar Rendering ---
async function renderMonthlyCalendar() {
  const calendarContainer = document.getElementById('monthViewContainer');
  if (!calendarContainer) {
    console.error('No #monthViewContainer container found');
    return;
  }
  // Always fetch business hours for the week (no date param) and exceptions
  await fetchBusinessHours();
  await fetchScheduleExceptions();
  console.log('DEBUG businessHours:', businessHours);
  calendarContainer.innerHTML = '';

  // Calendar controls and grid
  const calendar = document.createElement('div');
  calendar.className = 'calendar-container';
  const header = document.createElement('div');
  header.className = 'calendar-header d-flex justify-content-between align-items-center mb-2';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.title = 'Mes anterior';
  prevBtn.onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderMonthlyCalendar();
  };
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.title = 'Mes siguiente';
  nextBtn.onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderMonthlyCalendar();
  };
  const monthLabel = document.createElement('div');
  monthLabel.className = 'calendar-month-year fw-bold';
  monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  header.appendChild(prevBtn);
  header.appendChild(monthLabel);
  header.appendChild(nextBtn);
  calendar.appendChild(header);

  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  dayNames.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDate = new Date(firstDay);
  // Ensure week starts on Sunday (0)
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  let currentCalendarDate = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dayElement = document.createElement('button');
      dayElement.type = 'button';
      dayElement.className = 'calendar-day';
      dayElement.textContent = currentCalendarDate.getDate();
      const isCurrentMonth = currentCalendarDate.getMonth() === currentMonth;
      const isCurrentYear = currentCalendarDate.getFullYear() === currentYear;
      const isPast = isPastDate(currentCalendarDate);
      const isOpenDay = isDayOpen(currentCalendarDate);
      const isTodayDate = isToday(currentCalendarDate);
      const isSelectedDate = selectedDate && currentCalendarDate.toDateString() === selectedDate.toDateString();
      if (isCurrentMonth && isCurrentYear) {
        console.log(`DEBUG ${formatDate(currentCalendarDate)} isOpenDay:`, isOpenDay);
      }
      // Block past days
      if (isTodayDate && !isSelectedDate) dayElement.classList.add('today');
      if (isSelectedDate) dayElement.classList.add('selected');
      if (!isCurrentMonth || !isCurrentYear) {
        dayElement.classList.add('other-month');
        dayElement.disabled = true;
      } else if (isPast) {
        dayElement.classList.add('disabled');
        dayElement.disabled = true;
      } else if (!isOpenDay) {
        dayElement.classList.add('unavailable');
        dayElement.disabled = true;
      } else {
        dayElement.classList.add('available');
        dayElement.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day.selected').forEach(day => day.classList.remove('selected'));
          dayElement.classList.add('selected');
          selectedDate = new Date(currentCalendarDate);
          renderMonthlyTimeSlots(selectedDate);
        });
        // Auto-load slots for today on first render
        if (isTodayDate && !selectedDate) {
          dayElement.classList.add('selected');
          selectedDate = new Date(currentCalendarDate);
          renderMonthlyTimeSlots(selectedDate);
        }
      }
      grid.appendChild(dayElement);
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
  }
  calendar.appendChild(grid);
  calendarContainer.appendChild(calendar);
  // No need to create a slot container here; slots will be rendered into #timeCards
}

// --- Weekly Calendar Rendering ---
async function renderWeeklyCalendar() {
  const calendarContainer = document.getElementById('weeklyCalendar');
  if (!calendarContainer) return;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday as start
  await fetchBusinessHours(weekStart);
  await fetchScheduleExceptions();
  calendarContainer.innerHTML = '';
  const weekRow = document.createElement('div');
  weekRow.className = 'd-flex justify-content-center align-items-center gap-2';
  // Prev arrow
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'btn btn-light week-arrow';
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.title = 'Semana anterior';
  prevBtn.onclick = () => {
    weekStart.setDate(weekStart.getDate() - 7);
    renderWeeklyCalendarForDate(weekStart);
  };
  weekRow.appendChild(prevBtn);
  // 7 day cards
  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + d);
  const dayOfWeek = getDayOfWeekString(day).toLowerCase();
  const businessDay = businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek);
  console.log(`DEBUG Weekly: ${formatDate(day)} maps to businessHours[${dayOfWeek}]`, businessDay);
  const isOpenDay = isDayOpen(day);
    const isTodayDate = isToday(day);
    const isSelectedDate = selectedDate && day.toDateString() === selectedDate.toDateString();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn calendar-day-btn d-flex flex-column align-items-center py-2';
    btn.dataset.date = formatDate(day);
    const dayLabel = document.createElement('span');
    dayLabel.className = 'small fw-bold';
    dayLabel.textContent = day.toLocaleDateString('es-MX', { weekday: 'short' });
    const dateLabel = document.createElement('span');
    dateLabel.textContent = `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`;
    btn.appendChild(dayLabel);
    btn.appendChild(dateLabel);
    // Block previous days
    const isPast = isPastDate(day);
    if (isTodayDate && !isSelectedDate) btn.classList.add('today');
    if (isSelectedDate) btn.classList.add('selected');
    if (!isOpenDay || isPast) {
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      btn.title = !isOpenDay ? 'Cerrado' : 'No disponible';
    } else {
      btn.classList.add('btn-outline-primary');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDate = day;
        renderTimeSlots(day);
      });
      // Auto-load slots for today on first render
      if (isTodayDate && !selectedDate) {
        btn.classList.add('selected');
        selectedDate = day;
        renderTimeSlots(day);
      }
    }
    weekRow.appendChild(btn);
  }
  // Next arrow
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-light week-arrow';
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.title = 'Semana siguiente';
  nextBtn.onclick = () => {
    weekStart.setDate(weekStart.getDate() + 7);
    renderWeeklyCalendarForDate(weekStart);
  };
  weekRow.appendChild(nextBtn);
  calendarContainer.appendChild(weekRow);
  // No need to create a slot container here; slots will be rendered into #timeCards
}

// Helper to render a specific week
async function renderWeeklyCalendarForDate(date) {
  const calendarContainer = document.getElementById('weeklyCalendar');
  if (!calendarContainer) return;
  await fetchBusinessHours(date);
  await fetchScheduleExceptions();
  calendarContainer.innerHTML = '';
  const weekRow = document.createElement('div');
  weekRow.className = 'd-flex justify-content-center align-items-center gap-2';
  // Prev arrow
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'btn btn-light week-arrow';
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.title = 'Semana anterior';
  prevBtn.onclick = () => {
    date.setDate(date.getDate() - 7);
    renderWeeklyCalendarForDate(date);
  };
  weekRow.appendChild(prevBtn);
  // 7 day cards
  for (let d = 0; d < 7; d++) {
    const day = new Date(date);
    day.setDate(date.getDate() + d);
  const dayOfWeek = getDayOfWeekString(day).toLowerCase();
  const businessDay = businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek);
  console.log(`DEBUG Weekly: ${formatDate(day)} maps to businessHours[${dayOfWeek}]`, businessDay);
  const isOpenDay = isDayOpen(day);
    const isTodayDate = isToday(day);
    const isSelectedDate = selectedDate && day.toDateString() === selectedDate.toDateString();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn calendar-day-btn d-flex flex-column align-items-center py-2';
    btn.dataset.date = formatDate(day);
    const dayLabel = document.createElement('span');
    dayLabel.className = 'small fw-bold';
    dayLabel.textContent = day.toLocaleDateString('es-MX', { weekday: 'short' });
    const dateLabel = document.createElement('span');
    dateLabel.textContent = `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`;
    btn.appendChild(dayLabel);
    btn.appendChild(dateLabel);
    // Block previous days
    const isPast = isPastDate(day);
    if (isTodayDate && !isSelectedDate) btn.classList.add('today');
    if (isSelectedDate) btn.classList.add('selected');
    if (!isOpenDay || isPast) {
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      btn.title = !isOpenDay ? 'Cerrado' : 'No disponible';
    } else {
      btn.classList.add('btn-outline-primary');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDate = day;
        renderTimeSlots(day);
      });
    }
    weekRow.appendChild(btn);
  }
  // Next arrow
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-light week-arrow';
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.title = 'Semana siguiente';
  nextBtn.onclick = () => {
    date.setDate(date.getDate() + 7);
    renderWeeklyCalendarForDate(date);
  };
  weekRow.appendChild(nextBtn);
  calendarContainer.appendChild(weekRow);
}

// --- Slot Fetching and Rendering ---
async function fetchAvailableSlots(date) {
  const dateStr = formatDate(date);
  try {
    const response = await fetch(`/api/available-slots/${dateStr}`);
    if (!response.ok) throw new Error('Failed to fetch available slots');
    const data = await response.json();
    return data.availableSlots || [];
  } catch (e) {
    return [];
  }
}

async function renderTimeSlots(date) {
  const slotContainer = document.getElementById('timeCards');
  if (!slotContainer) return;
  slotContainer.innerHTML = '<div class="text-center">Cargando horarios...</div>';
  // Find business hours for this day
  const dayOfWeek = getDayOfWeekString(date).toLowerCase();
  const businessDay = businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek);
  if (!businessDay || !businessDay.is_open || !businessDay.open_time || !businessDay.close_time) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  // Generate slots for this day
  const slots = await fetchAvailableSlots(date);
  slotContainer.innerHTML = '';
  if (!slots.length) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  const now = new Date();
  const row = document.createElement('div');
  row.className = 'row g-2';
  slots.forEach(time => {
    // Normalize to HH:mm for comparison
    const slotHM = time.slice(0,5);
    const openHM = businessDay.open_time.slice(0,5);
    const closeHM = businessDay.close_time.slice(0,5);
    if (slotHM < openHM || slotHM > closeHM) return;
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 mb-2';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary time-slot-btn';
    btn.textContent = formatTimeToAMPM(time);
    btn.dataset.time24 = time;
    // Block past hours and <30 min anticipation
    const slotDateTime = new Date(`${formatDate(date)}T${time}:00`);
    if (slotDateTime < new Date(now.getTime() + 30 * 60 * 1000)) {
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.title = 'No disponible (menos de 30 minutos de anticipación o pasado)';
    } else {
      btn.addEventListener('click', () => selectTimeSlot(time, btn));
    }
    col.appendChild(btn);
    row.appendChild(col);
  });
  slotContainer.appendChild(row);
}

// --- Slot Fetching and Rendering for Monthly View ---
async function renderMonthlyTimeSlots(date) {
  const slotContainer = document.getElementById('timeCards');
  if (!slotContainer) return;
  slotContainer.innerHTML = '<div class="text-center">Cargando horarios...</div>';
  // Find business hours for this day
  const dayOfWeek = getDayOfWeekString(date).toLowerCase();
  const businessDay = businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek);
  if (!businessDay || !businessDay.is_open || !businessDay.open_time || !businessDay.close_time) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  // Generate slots for this day
  const slots = await fetchAvailableSlots(date);
  slotContainer.innerHTML = '';
  if (!slots.length) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  const now = new Date();
  const row = document.createElement('div');
  row.className = 'row g-2';
  slots.forEach(time => {
    // Normalize to HH:mm for comparison
    const slotHM = time.slice(0,5);
    const openHM = businessDay.open_time.slice(0,5);
    const closeHM = businessDay.close_time.slice(0,5);
    if (slotHM < openHM || slotHM > closeHM) return;
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 mb-2';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary time-slot-btn';
    btn.textContent = formatTimeToAMPM(time);
    btn.dataset.time24 = time;
    // Block past hours and <30 min anticipation
    const slotDateTime = new Date(`${formatDate(date)}T${time}:00`);
    if (slotDateTime < new Date(now.getTime() + 30 * 60 * 1000)) {
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.title = 'No disponible (menos de 30 minutos de anticipación o pasado)';
    } else {
      btn.addEventListener('click', () => selectTimeSlot(time, btn));
    }
    col.appendChild(btn);
    row.appendChild(col);
  });
  slotContainer.appendChild(row);
}

function selectTimeSlot(time, btnElement) {
  document.querySelectorAll('.time-slot-btn.active').forEach(btn => {
    btn.classList.remove('active', 'btn-primary');
    btn.classList.add('btn-outline-primary');
  });
  btnElement.classList.remove('btn-outline-primary');
  btnElement.classList.add('btn-primary', 'active');
  // Store selected time if needed
}

// --- Date Selection ---
async function selectCalendarDate(date, dayElement) {
  if (dayElement.classList.contains('disabled') || dayElement.classList.contains('other-month') || dayElement.classList.contains('unavailable')) return;
  document.querySelectorAll('.calendar-day.selected').forEach(day => day.classList.remove('selected'));
  dayElement.classList.add('selected');
  selectedDate = date;
  // Optionally, load time slots for the selected date here
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  renderWeeklyCalendar();
  // --- Calendar View Toggle Logic ---
  function setupCalendarViewToggle() {
    const weekRadio = document.getElementById('weekView');
    const monthRadio = document.getElementById('monthView');
    const weekContainer = document.getElementById('weekViewContainer');
    const monthContainer = document.getElementById('monthViewContainer');
    if (!weekRadio || !monthRadio || !weekContainer || !monthContainer) return;
    weekRadio.addEventListener('change', () => {
      if (weekRadio.checked) {
        weekContainer.style.display = '';
        monthContainer.style.display = 'none';
        // Clear monthly calendar and slots to avoid stale content
        const monthViewContainer = document.getElementById('monthViewContainer');
        if (monthViewContainer) monthViewContainer.innerHTML = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        selectedDate = null;
      }
    });
    monthRadio.addEventListener('change', () => {
      if (monthRadio.checked) {
        // Reset to current month/year when switching to monthly view
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        weekContainer.style.display = 'none';
        monthContainer.style.display = '';
        // Clear slots before rendering
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        selectedDate = null;
        // Only render after container is visible, with a slight delay
        setTimeout(() => {
          renderMonthlyCalendar();
        }, 50);
      }
    });
  }
  setupCalendarViewToggle();
  // Only render the default view (week) on load
});
