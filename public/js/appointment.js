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

// --- Data Fetch ---
async function fetchBusinessHours(date) {
  try {
    const dateParam = date ? `/${formatDate(date)}` : '';
    const response = await fetch(`/api/business-hours${dateParam}`);
    if (!response.ok) throw new Error('Failed to fetch business hours');
    const data = await response.json();
    let arr = Array.isArray(data) ? data : (Array.isArray(data.business_hours) ? data.business_hours : []);
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
  // Always fetch business hours and exceptions for the first day of the month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  await fetchBusinessHours(firstDayOfMonth);
  await fetchScheduleExceptions();
  calendarContainer.innerHTML = '';
  // Heading for accessibility and clarity
  const heading = document.createElement('h6');
  heading.className = 'mb-3 text-center text-primary';
  heading.innerHTML = '<i class="fas fa-calendar-alt me-2"></i>Calendario Mensual';
  calendarContainer.appendChild(heading);

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
    const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
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
    // Disable if in the past
    const now = new Date();
    now.setSeconds(0, 0);
    let isPast = false;
    if (day < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      isPast = true;
    } else if (isTodayDate) {
      // If today, check if all slots are less than 30 minutes from now
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999);
      // If now is after end of day minus 30 minutes, disable
      const lastBookable = new Date(day);
      lastBookable.setHours(now.getHours(), now.getMinutes() + 30, 0, 0);
      if (lastBookable > endOfDay) isPast = true;
    }
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
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() + d);
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
    if (isTodayDate && !isSelectedDate) btn.classList.add('today');
    if (isSelectedDate) btn.classList.add('selected');
    if (!isOpenDay) {
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      btn.title = 'Cerrado';
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
  const slots = await fetchAvailableSlots(date);
  slotContainer.innerHTML = '';
  if (!slots.length) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'row g-2';
  slots.forEach(time => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 mb-2';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary time-slot-btn';
    btn.textContent = formatTimeToAMPM(time);
    btn.dataset.time24 = time;
    btn.addEventListener('click', () => selectTimeSlot(time, btn));
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
  const slots = await fetchAvailableSlots(date);
  slotContainer.innerHTML = '';
  if (!slots.length) {
    slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'row g-2';
  slots.forEach(time => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 mb-2';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary time-slot-btn';
    btn.textContent = formatTimeToAMPM(time);
    btn.dataset.time24 = time;
    btn.addEventListener('click', () => selectTimeSlot(time, btn));
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
        const monthlyCalendar = document.getElementById('monthlyCalendar');
        if (monthlyCalendar) monthlyCalendar.innerHTML = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        selectedDate = null;
      }
    });
    monthRadio.addEventListener('change', () => {
      if (monthRadio.checked) {
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
